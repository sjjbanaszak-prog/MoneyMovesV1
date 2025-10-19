import {
  collection,
  doc,
  getDoc,
  setDoc,
  getDocs,
  query,
  where,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../../firebase";

/**
 * TemplateTrainer - Learns from user-confirmed mappings to improve future uploads
 *
 * Features:
 * - Stores provider-specific field mappings
 * - Tracks success rates and usage frequency
 * - Retrieves templates for auto-mapping
 * - Updates confidence scores based on user feedback
 */

/**
 * Save a confirmed mapping template to Firestore
 *
 * @param {string} userId - User ID
 * @param {string} provider - Provider name
 * @param {string} context - Context type (pensions, savings, etc.)
 * @param {Object} mapping - Confirmed field mapping
 * @param {Object} confidenceScores - Confidence scores for each field
 * @param {string} dateFormat - Detected date format
 * @param {string} frequency - Detected payment frequency
 * @param {Array} headers - Original CSV headers
 * @returns {Promise<void>}
 */
export async function saveTemplate(
  userId,
  provider,
  context,
  mapping,
  confidenceScores,
  dateFormat,
  frequency,
  headers
) {
  try {
    // Create template ID: provider_context (e.g., "aviva_pensions")
    const templateId = `${provider.toLowerCase().replace(/\s+/g, "_")}_${context}`;

    const templateRef = doc(
      db,
      "users",
      userId,
      "file_upload_templates",
      templateId
    );

    // Check if template exists
    const existingTemplate = await getDoc(templateRef);

    if (existingTemplate.exists()) {
      // Update existing template
      const existing = existingTemplate.data();

      // Merge field mappings and update success rates
      const updatedMappings = mergeFieldMappings(
        existing.fieldMappings || [],
        mapping,
        confidenceScores
      );

      await updateDoc(templateRef, {
        fieldMappings: updatedMappings,
        dateFormat: dateFormat || existing.dateFormat,
        frequency: frequency || existing.frequency,
        lastUsed: serverTimestamp(),
        usageCount: (existing.usageCount || 0) + 1,
        successRate: calculateSuccessRate(updatedMappings),
        updatedAt: serverTimestamp(),
      });
    } else {
      // Create new template
      const fieldMappings = Object.entries(mapping).map(([field, header]) => ({
        originalHeader: header,
        mappedField: field,
        confidence: confidenceScores[field] || 0,
        successCount: 1,
        totalAttempts: 1,
      }));

      await setDoc(templateRef, {
        providerName: provider,
        context,
        fieldMappings,
        dateFormat,
        frequency,
        exampleHeaders: headers,
        lastUsed: serverTimestamp(),
        usageCount: 1,
        successRate: 100,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    console.log(`Template saved for ${provider} (${context})`);
  } catch (error) {
    console.error("Error saving template:", error);
    throw error;
  }
}

/**
 * Retrieve a template for a specific provider and context
 *
 * @param {string} userId - User ID
 * @param {string} provider - Provider name
 * @param {string} context - Context type
 * @returns {Promise<Object|null>} Template data or null
 */
export async function getTemplate(userId, provider, context) {
  try {
    const templateId = `${provider.toLowerCase().replace(/\s+/g, "_")}_${context}`;
    const templateRef = doc(
      db,
      "users",
      userId,
      "file_upload_templates",
      templateId
    );

    const templateDoc = await getDoc(templateRef);

    if (templateDoc.exists()) {
      return { id: templateDoc.id, ...templateDoc.data() };
    }

    return null;
  } catch (error) {
    console.error("Error retrieving template:", error);
    return null;
  }
}

/**
 * Get all templates for a context (useful for fallback matching)
 *
 * @param {string} userId - User ID
 * @param {string} context - Context type
 * @returns {Promise<Array>} Array of templates
 */
export async function getTemplatesByContext(userId, context) {
  try {
    const templatesRef = collection(
      db,
      "users",
      userId,
      "file_upload_templates"
    );
    const q = query(templatesRef, where("context", "==", context));
    const querySnapshot = await getDocs(q);

    const templates = [];
    querySnapshot.forEach((doc) => {
      templates.push({ id: doc.id, ...doc.data() });
    });

    // Sort by success rate and usage count
    templates.sort((a, b) => {
      const scoreA = (a.successRate || 0) * 0.6 + (a.usageCount || 0) * 0.4;
      const scoreB = (b.successRate || 0) * 0.6 + (b.usageCount || 0) * 0.4;
      return scoreB - scoreA;
    });

    return templates;
  } catch (error) {
    console.error("Error retrieving templates by context:", error);
    return [];
  }
}

/**
 * Record user feedback on a mapping (correct or incorrect)
 *
 * @param {string} userId - User ID
 * @param {string} provider - Provider name
 * @param {string} context - Context type
 * @param {string} field - Field that was mapped
 * @param {string} header - Original header
 * @param {boolean} wasCorrect - Whether the mapping was correct
 * @returns {Promise<void>}
 */
export async function recordFeedback(
  userId,
  provider,
  context,
  field,
  header,
  wasCorrect
) {
  try {
    const templateId = `${provider.toLowerCase().replace(/\s+/g, "_")}_${context}`;
    const templateRef = doc(
      db,
      "users",
      userId,
      "file_upload_templates",
      templateId
    );

    const templateDoc = await getDoc(templateRef);

    if (templateDoc.exists()) {
      const template = templateDoc.data();
      const fieldMappings = template.fieldMappings || [];

      // Find matching field mapping
      const mappingIndex = fieldMappings.findIndex(
        (fm) => fm.mappedField === field && fm.originalHeader === header
      );

      if (mappingIndex >= 0) {
        // Update existing mapping
        fieldMappings[mappingIndex].totalAttempts += 1;
        if (wasCorrect) {
          fieldMappings[mappingIndex].successCount += 1;
        }

        // Recalculate confidence
        fieldMappings[mappingIndex].confidence = Math.round(
          (fieldMappings[mappingIndex].successCount /
            fieldMappings[mappingIndex].totalAttempts) *
            100
        );
      } else {
        // Add new mapping
        fieldMappings.push({
          originalHeader: header,
          mappedField: field,
          confidence: wasCorrect ? 100 : 0,
          successCount: wasCorrect ? 1 : 0,
          totalAttempts: 1,
        });
      }

      await updateDoc(templateRef, {
        fieldMappings,
        successRate: calculateSuccessRate(fieldMappings),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    console.error("Error recording feedback:", error);
  }
}

/**
 * Merge new field mappings with existing ones
 *
 * @param {Array} existingMappings - Existing field mappings
 * @param {Object} newMapping - New mapping to merge
 * @param {Object} newConfidenceScores - Confidence scores for new mapping
 * @returns {Array} Merged field mappings
 */
function mergeFieldMappings(existingMappings, newMapping, newConfidenceScores) {
  const merged = [...existingMappings];

  Object.entries(newMapping).forEach(([field, header]) => {
    const existingIndex = merged.findIndex(
      (fm) => fm.mappedField === field && fm.originalHeader === header
    );

    if (existingIndex >= 0) {
      // Update existing mapping
      merged[existingIndex].totalAttempts += 1;
      merged[existingIndex].successCount += 1; // User confirmed, so it's correct

      // Recalculate confidence with weighted average
      const oldConfidence = merged[existingIndex].confidence || 0;
      const newConfidence = newConfidenceScores[field] || 0;
      merged[existingIndex].confidence = Math.round(
        (oldConfidence * 0.4 + newConfidence * 0.6)
      );
    } else {
      // Add new mapping
      merged.push({
        originalHeader: header,
        mappedField: field,
        confidence: newConfidenceScores[field] || 0,
        successCount: 1,
        totalAttempts: 1,
      });
    }
  });

  return merged;
}

/**
 * Calculate overall success rate for a template
 *
 * @param {Array} fieldMappings - Field mappings
 * @returns {number} Success rate (0-100)
 */
function calculateSuccessRate(fieldMappings) {
  if (fieldMappings.length === 0) return 0;

  const totalSuccess = fieldMappings.reduce(
    (sum, fm) => sum + (fm.successCount || 0),
    0
  );
  const totalAttempts = fieldMappings.reduce(
    (sum, fm) => sum + (fm.totalAttempts || 1),
    0
  );

  return Math.round((totalSuccess / totalAttempts) * 100);
}

/**
 * Find best matching template based on header similarity
 *
 * @param {string} userId - User ID
 * @param {string} context - Context type
 * @param {Array} headers - CSV headers from uploaded file
 * @returns {Promise<Object|null>} Best matching template or null
 */
export async function findBestMatchingTemplate(userId, context, headers) {
  try {
    const templates = await getTemplatesByContext(userId, context);

    if (templates.length === 0) return null;

    // Score each template based on header overlap
    const scoredTemplates = templates.map((template) => {
      const exampleHeaders = template.exampleHeaders || [];
      const overlap = countHeaderOverlap(headers, exampleHeaders);
      const overlapRate = overlap / Math.max(headers.length, 1);

      // Combined score: 50% success rate, 30% header overlap, 20% usage count
      const score =
        (template.successRate || 0) * 0.5 +
        overlapRate * 100 * 0.3 +
        Math.min(template.usageCount || 0, 10) * 10 * 0.2;

      return { ...template, matchScore: score, headerOverlap: overlap };
    });

    // Sort by match score
    scoredTemplates.sort((a, b) => b.matchScore - a.matchScore);

    // Return best match if score is reasonable (>30)
    return scoredTemplates[0]?.matchScore > 30 ? scoredTemplates[0] : null;
  } catch (error) {
    console.error("Error finding best matching template:", error);
    return null;
  }
}

/**
 * Count overlapping headers between two arrays
 *
 * @param {Array} headers1 - First header array
 * @param {Array} headers2 - Second header array
 * @returns {number} Number of overlapping headers
 */
function countHeaderOverlap(headers1, headers2) {
  const set1 = new Set(headers1.map((h) => h.toLowerCase()));
  const set2 = new Set(headers2.map((h) => h.toLowerCase()));

  let overlap = 0;
  set1.forEach((h) => {
    if (set2.has(h)) overlap++;
  });

  return overlap;
}
