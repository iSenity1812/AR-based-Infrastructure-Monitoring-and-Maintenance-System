package auth

import (
	"crypto/subtle"
)

func VerifyToken(inputToken, expectedToken string) bool {
	inputTokenBytes := []byte(inputToken)
	expectedTokenBytes := []byte(expectedToken)

	if len(inputTokenBytes) != len(expectedTokenBytes) {
		// prevent timing attacks by comparing the tokens even if they are of different lengths
		_ = subtle.ConstantTimeCompare(inputTokenBytes, expectedTokenBytes)
		return false
	}
	return subtle.ConstantTimeCompare(inputTokenBytes, expectedTokenBytes) == 1
}
