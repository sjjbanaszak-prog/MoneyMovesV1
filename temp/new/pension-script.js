        // Carry Forward Data
        const carryForwardData = {
            years: [
                {
                    year: '2019/20',
                    allowance: 40000,
                    used: 10000,
                    breakdown: {
                        currentYear: 10000,
                        carryForward: []
                    }
                },
                {
                    year: '2020/21',
                    allowance: 40000,
                    used: 0,
                    breakdown: {
                        currentYear: 0,
                        carryForward: []
                    }
                },
                {
                    year: '2021/22',
                    allowance: 40000,
                    used: 40000,
                    breakdown: {
                        currentYear: 40000,
                        carryForward: []
                    }
                },
                {
                    year: '2022/23',
                    allowance: 40000,
                    used: 50000,
                    breakdown: {
                        currentYear: 40000,
                        carryForward: [
                            { fromYear: '2019/20', amount: 10000 }
                        ]
                    }
                },
                {
                    year: '2023/24',
                    allowance: 60000,
                    used: 52000,
                    breakdown: {
                        currentYear: 52000,
                        carryForward: []
                    }
                },
                {
                    year: '2024/25',
                    allowance: 60000,
                    used: 78000,
                    breakdown: {
                        currentYear: 60000,
                        carryForward: [
                            { fromYear: '2021/22', amount: 5000 },
                            { fromYear: '2023/24', amount: 13000 }
                        ]
                    }
                }
            ]
        };

        let currentView = 'overview';
        let selectedYear = null;

        function renderOverviewChart() {
            const container = document.getElementById('carryForwardChart');
            const maxHeight = 200; // max height in pixels
            
            // Find the maximum contribution amount across all years for scaling
            const maxContribution = Math.max(...carryForwardData.years.map(y => y.used));
            
            // Determine current year index (last year in array)
            const currentYearIndex = carryForwardData.years.length - 1;
            
            let html = '<div class="cf-bars-container">';
            
            carryForwardData.years.forEach((yearData, index) => {
                const hasCarryForward = yearData.breakdown.carryForward.length > 0;
                
                // Determine if this year's unused allowance is lost (more than 3 years before current)
                const yearsBeforeCurrent = currentYearIndex - index;
                const isLostAllowance = yearsBeforeCurrent > 3;
                
                // Calculate actual pixel heights based on max contribution for responsive scaling
                const totalUsed = yearData.used;
                const currentYearAmount = yearData.breakdown.currentYear;
                const carryForwardTotal = yearData.breakdown.carryForward.reduce((sum, cf) => sum + cf.amount, 0);
                
                // Scale bar heights based on maximum contribution (not allowance)
                const totalHeight = totalUsed > 0 ? (totalUsed / maxContribution) * maxHeight : 0;
                const currentYearHeight = totalUsed > 0 ? (currentYearAmount / totalUsed) * totalHeight : 0;
                const carryForwardHeight = totalUsed > 0 ? (carryForwardTotal / totalUsed) * totalHeight : 0;
                const unusedHeight = totalUsed < yearData.allowance ? ((yearData.allowance - totalUsed) / maxContribution) * maxHeight : 0;
                
                html += `
                    <div class="cf-bar-wrapper" onclick="selectYear(${index})" style="${hasCarryForward ? 'cursor: pointer;' : 'cursor: default;'}">
                        <div class="cf-bar-stack" style="height: ${totalHeight + unusedHeight}px;">
                `;
                
                // Using flex-direction: column-reverse means:
                // FIRST DOM element = appears at BOTTOM visually
                // LAST DOM element = appears at TOP visually
                
                // Only render bars if there's actual contribution
                if (totalUsed > 0) {
                    // Add current year FIRST (will appear at BOTTOM)
                    html += `<div class="cf-bar-segment current-year" style="height: ${currentYearHeight}px;"></div>`;
                    
                    // Add carry forward SECOND (will appear in MIDDLE)
                    if (hasCarryForward) {
                        html += `<div class="cf-bar-segment carry-forward" style="height: ${carryForwardHeight}px;"></div>`;
                    }
                }
                
                // Add unused/lost LAST (will appear at TOP)
                if (unusedHeight > 0) {
                    const allowanceClass = isLostAllowance ? 'lost' : 'unused';
                    html += `<div class="cf-bar-segment ${allowanceClass}" style="height: ${unusedHeight}px;"></div>`;
                }
                
                html += `</div>
                        <div class="cf-year-label">${yearData.year}</div>
                        <div class="cf-amount-label">£${yearData.used.toLocaleString()}</div>
                    </div>
                `;
            });
            
            html += '</div>';
            
            // Add legend
            html += `
                <div class="cf-legend">
                    <div class="cf-legend-item">
                        <div class="cf-legend-color" style="background: linear-gradient(180deg, #6366f1 0%, #4f46e5 100%);"></div>
                        <span>Allowance Used</span>
                    </div>
                    <div class="cf-legend-item">
                        <div class="cf-legend-color" style="background: linear-gradient(180deg, #8b5cf6 0%, #7c3aed 100%);"></div>
                        <span>Carry Forward Used</span>
                    </div>
                    <div class="cf-legend-item">
                        <div class="cf-legend-color" style="background: rgba(99, 102, 241, 0.2); border: 1px dashed rgba(99, 102, 241, 0.4);"></div>
                        <span>Unused Allowance</span>
                    </div>
                    <div class="cf-legend-item">
                        <div class="cf-legend-color" style="background: rgba(239, 68, 68, 0.2); border: 1px dashed rgba(239, 68, 68, 0.4);"></div>
                        <span>Lost Allowance</span>
                    </div>
                </div>
            `;
            
            container.innerHTML = html;
        }

        function selectYear(yearIndex) {
            const yearData = carryForwardData.years[yearIndex];
            
            // Only allow drill-down if there's carry forward
            if (yearData.breakdown.carryForward.length === 0) {
                return;
            }
            
            const container = document.getElementById('carryForwardChart');
            const barsContainer = container.querySelector('.cf-bars-container');
            const allWrappers = Array.from(barsContainer.querySelectorAll('.cf-bar-wrapper'));
            
            // Store original states for each year before animation
            const originalStates = carryForwardData.years.map((yd, idx) => {
                const wrapper = allWrappers[idx];
                const stack = wrapper.querySelector('.cf-bar-stack');
                return {
                    height: stack.style.height,
                    segments: Array.from(stack.querySelectorAll('.cf-bar-segment')).map(seg => ({
                        className: seg.className,
                        height: seg.style.height
                    }))
                };
            });
            
            // Calculate new heights based on drill-down logic
            const maxContribution = Math.max(...carryForwardData.years.map(y => y.used));
            const maxHeight = 200;
            const currentYearIndex = carryForwardData.years.length - 1;
            
            // Animate each bar
            carryForwardData.years.forEach((yd, idx) => {
                const wrapper = allWrappers[idx];
                const stack = wrapper.querySelector('.cf-bar-stack');
                const segments = stack.querySelectorAll('.cf-bar-segment');
                const amountLabel = wrapper.querySelector('.cf-amount-label');
                
                if (idx === yearIndex) {
                    // This is the clicked year - shrink to just current year allowance
                    const newHeight = (yearData.breakdown.currentYear / maxContribution) * maxHeight;
                    
                    // Animate the stack height
                    stack.style.height = `${newHeight}px`;
                    
                    // Fade out carry forward segment if exists, keep current year
                    segments.forEach((seg, segIdx) => {
                        if (seg.classList.contains('carry-forward')) {
                            seg.style.height = '0px';
                        } else if (seg.classList.contains('current-year')) {
                            seg.style.height = '100%';
                        } else {
                            // Unused/lost segments should disappear
                            seg.style.height = '0px';
                        }
                    });
                    
                    // Update amount label
                    amountLabel.style.transition = 'opacity 0.3s ease-out';
                    amountLabel.style.opacity = '0';
                    setTimeout(() => {
                        amountLabel.textContent = `£${yearData.breakdown.currentYear.toLocaleString()}`;
                        amountLabel.style.opacity = '1';
                    }, 300);
                    
                } else {
                    // Check if this year provided carry forward to the clicked year
                    const amountUsedFromThisYear = yearData.breakdown.carryForward.find(
                        cf => cf.fromYear === yd.year
                    );
                    
                    if (amountUsedFromThisYear) {
                        // This year contributed to the carry forward
                        const cfAmount = amountUsedFromThisYear.amount;
                        const cfHeight = (cfAmount / maxContribution) * maxHeight;
                        
                        // Calculate remaining unused allowance for this year
                        const totalUsedInYear = yd.used;
                        const remaining = yd.allowance - totalUsedInYear;
                        const unusedHeight = remaining > 0 ? (remaining / maxContribution) * maxHeight : 0;
                        
                        // Determine if unused is "lost" - check relative to CURRENT year (not clicked year)
                        const yearsBeforeCurrent = currentYearIndex - idx;
                        const isLostAllowance = yearsBeforeCurrent > 3;
                        
                        // Set total height
                        stack.style.height = `${cfHeight + unusedHeight}px`;
                        
                        // Animate existing segments to new sizes and colors
                        let currentSegment = 0;
                        segments.forEach(seg => {
                            if (currentSegment === 0 && seg.classList.contains('current-year')) {
                                // Convert current-year to carry-forward
                                seg.classList.remove('current-year');
                                seg.classList.add('carry-forward');
                                seg.style.height = `${cfHeight}px`;
                                currentSegment++;
                            } else if (currentSegment === 0) {
                                // First segment should be carry-forward
                                seg.className = 'cf-bar-segment carry-forward';
                                seg.style.height = `${cfHeight}px`;
                                currentSegment++;
                            } else if (currentSegment === 1 && unusedHeight > 0) {
                                // Second segment is unused/lost
                                const allowanceClass = isLostAllowance ? 'lost' : 'unused';
                                seg.className = `cf-bar-segment ${allowanceClass}`;
                                seg.style.height = `${unusedHeight}px`;
                                currentSegment++;
                            } else {
                                // Hide other segments
                                seg.style.height = '0px';
                            }
                        });
                        
                        // Update amount label
                        amountLabel.style.transition = 'opacity 0.3s ease-out';
                        amountLabel.style.opacity = '0';
                        setTimeout(() => {
                            amountLabel.textContent = `£${cfAmount.toLocaleString()}`;
                            amountLabel.style.opacity = '1';
                        }, 300);
                        
                    } else {
                        // This year did not contribute - check if it's within carry forward window
                        const yearsBeforeClicked = yearIndex - idx;
                        const yearsBeforeCurrent = currentYearIndex - idx;
                        const isInCarryForwardWindow = yearsBeforeClicked <= 3 && yearsBeforeClicked > 0;
                        
                        if (isInCarryForwardWindow) {
                            // Show unused/lost allowance for years in the 3-year window
                            const totalUsedInYear = yd.used;
                            const remaining = yd.allowance - totalUsedInYear;
                            
                            if (remaining > 0) {
                                const unusedHeight = (remaining / maxContribution) * maxHeight;
                                // Determine if lost relative to CURRENT year
                                const isLostAllowance = yearsBeforeCurrent > 3;
                                
                                stack.style.height = `${unusedHeight}px`;
                                
                                // Convert all segments to unused/lost
                                segments.forEach((seg, segIdx) => {
                                    if (segIdx === 0) {
                                        const allowanceClass = isLostAllowance ? 'lost' : 'unused';
                                        seg.className = `cf-bar-segment ${allowanceClass}`;
                                        seg.style.height = '100%';
                                    } else {
                                        seg.style.height = '0px';
                                    }
                                });
                                
                                amountLabel.style.transition = 'opacity 0.3s ease-out';
                                amountLabel.style.opacity = '0';
                                setTimeout(() => {
                                    amountLabel.textContent = `£0`;
                                    amountLabel.style.opacity = '1';
                                }, 300);
                            } else {
                                // No remaining allowance
                                stack.style.height = '0px';
                                segments.forEach(seg => seg.style.height = '0px');
                                
                                amountLabel.style.transition = 'opacity 0.3s ease-out';
                                amountLabel.style.opacity = '0';
                                setTimeout(() => {
                                    amountLabel.textContent = `£0`;
                                    amountLabel.style.opacity = '1';
                                }, 300);
                            }
                        } else {
                            // Outside carry forward window or after clicked year - hide completely
                            stack.style.height = '0px';
                            segments.forEach(seg => seg.style.height = '0px');
                            
                            amountLabel.style.transition = 'opacity 0.3s ease-out';
                            amountLabel.style.opacity = '0';
                            setTimeout(() => {
                                amountLabel.textContent = `£0`;
                                amountLabel.style.opacity = '1';
                            }, 300);
                        }
                    }
                }
            });
            
            // Mark current view and show back button
            currentView = 'drilldown';
            selectedYear = yearIndex;
            
            // Store original states for reverse animation
            window.originalStates = originalStates;
            
            setTimeout(() => {
                document.getElementById('backBtn').style.display = 'block';
            }, 100);
        }

        function goBack() {
            if (currentView !== 'drilldown' || selectedYear === null) return;
            
            const container = document.getElementById('carryForwardChart');
            const barsContainer = container.querySelector('.cf-bars-container');
            const allWrappers = Array.from(barsContainer.querySelectorAll('.cf-bar-wrapper'));
            
            // Restore original states
            carryForwardData.years.forEach((yd, idx) => {
                const wrapper = allWrappers[idx];
                const stack = wrapper.querySelector('.cf-bar-stack');
                const amountLabel = wrapper.querySelector('.cf-amount-label');
                const originalState = window.originalStates[idx];
                
                // Restore height
                stack.style.height = originalState.height;
                stack.style.transition = 'height 0.8s cubic-bezier(0.4, 0, 0.2, 1)';
                
                // Restore segments
                let segmentsHTML = '';
                originalState.segments.forEach(seg => {
                    segmentsHTML += `<div class="${seg.className}" style="height: ${seg.height}; transition: all 0.8s cubic-bezier(0.4, 0, 0.2, 1);"></div>`;
                });
                stack.innerHTML = segmentsHTML;
                
                // Restore amount label
                amountLabel.textContent = `£${yd.used.toLocaleString()}`;
            });
            
            // Hide back button
            document.getElementById('backBtn').style.display = 'none';
            
            // Reset view state
            currentView = 'overview';
            selectedYear = null;
        }

        // Initialize
        document.addEventListener('DOMContentLoaded', function() {
            renderOverviewChart();
            
            document.getElementById('backBtn').addEventListener('click', goBack);
        });
