const payloadStr = JSON.stringify({
    "statusCode": 401,
    "success": false,
    "message": "Email hoặc mật khẩu không chính xác!",
    "errorCode": "INVALID_CREDENTIALS",
    "errors": null,
    "traceId": null,
    "data": {
        "accessToken": null,
        "refreshToken": null,
        "expiresAt": null,
        "user": null,
        "remainingAttempts": 2,
        "lockoutEnd": null
    }
});

const error = {
    message: "Unauthorized",
    status: 401,
    response: payloadStr,
    result: JSON.parse(payloadStr)
};

class AuthFacade {
  extractErrorMessage(error, fallback) {
    const customError = error;
    if (customError && typeof customError === 'object') {
      if (customError.response) {
        const fromResponse = this.extractFromPayload(customError.response);
        if (fromResponse) return fromResponse;
      }
      if (customError.result) {
        const fromResult = this.extractFromPayload(customError.result);
        if (fromResult) return fromResult;
      }
    }

    if (error instanceof Error && error.message) {
      const fromMessage = this.extractFromPayload(error.message);
      return fromMessage ?? error.message;
    }

    return this.extractFromPayload(error) ?? fallback;
  }

  extractFromPayload(payload) {
    if (!payload) {
      return null;
    }

    if (typeof payload === 'string') {
      const trimmed = payload.trim();
      if (!trimmed) {
        return null;
      }

      try {
        const parsed = JSON.parse(trimmed);
        const parsedMessage = this.extractFromPayload(parsed);
        if (parsedMessage) {
          return parsedMessage;
        }
      } catch (e) {
        // Keep raw string when parsing fails.
      }

      return trimmed;
    }

    if (typeof payload !== 'object') {
      return null;
    }

    const data = payload;

    const directMessage = [
      data.message,
      data.title,
      data.detail,
      data.response,
      data.error,
    ]
      .map((item) => this.extractFromPayload(item))
      .find((item) => !!item);

    if (directMessage) {
      return directMessage;
    }

    if (data.errors && typeof data.errors === 'object') {
      const validationErrors = Object.values(data.errors)
        .flatMap((entry) => {
          if (Array.isArray(entry)) {
            return entry;
          }
          return [entry];
        })
        .map((entry) => String(entry).trim())
        .filter((entry) => !!entry);

      if (validationErrors.length) {
        return validationErrors[0];
      }
    }

    return null;
  }
}

const facade = new AuthFacade();
console.log("Extracted:", facade.extractErrorMessage(error, 'Fallback message.'));
