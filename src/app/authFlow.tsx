import { createContext, useContext } from "react";

export type AuthFlow = "signIn" | "signUp";

/** Lets a guest open the optional sign-up / sign-in dialog from anywhere. */
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
