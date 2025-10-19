// src/components/AuthButtons.js
import { signInWithPopup, signOut, auth, provider } from "../firebase";
import { useAuth } from "../context/AuthProvider";

export default function AuthButtons() {
  const { user } = useAuth();

  return user ? (
    <button onClick={() => signOut(auth)}>Sign Out ({user.displayName})</button>
  ) : (
    <button onClick={() => signInWithPopup(auth, provider)}>
      Sign In with Google
    </button>
  );
}

//THIS COULD POTENTIALLY BE DELETED//
