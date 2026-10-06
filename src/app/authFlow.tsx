import { createContext, useContext } from "react";

const SIGNED_OUT_KEY = "prospera:signed-out";

/**
 * After someone signs out of a real account we show the sign-in page instead
 * of dropping them straight back into a fresh guest workspace.
 */
export function wantsGuest() {
	try {
		return localStorage.getItem(SIGNED_OUT_KEY) !== "1";
	} catch {
		return true;
	}
}

export function setSignedOut(signedOut: boolean) {
	try {
		if (signedOut) localStorage.setItem(SIGNED_OUT_KEY, "1");
		else localStorage.removeItem(SIGNED_OUT_KEY);
	} catch {
		// Only affects whether a guest session starts automatically.
	}
}

export type AuthFlow = "signIn" | "signUp";

/** Lets a guest open the sign-in / sign-up screen from anywhere. */
export const AuthScreenContext = createContext<(flow: AuthFlow) => void>(
	() => {},
);

export const useOpenAuthScreen = () => useContext(AuthScreenContext);

const CLAIM_KEY = "prospera:guest-claim";

export function savePendingClaim(token: string) {
	try {
		sessionStorage.setItem(CLAIM_KEY, token);
	} catch {
		// Without storage the guest data simply isn't carried over.
	}
}

export function takePendingClaim(): string | null {
	try {
		const token = sessionStorage.getItem(CLAIM_KEY);
		sessionStorage.removeItem(CLAIM_KEY);
		return token;
	} catch {
		return null;
	}
}
