class AgentError(Exception):
    """Expected error safe to classify at the API boundary."""

    code = "agent_error"
    public_message = "The update agent could not complete the request."


class ConfigurationError(AgentError):
    code = "invalid_configuration"
    public_message = "The update agent configuration is invalid."


class AuthenticationError(AgentError):
    code = "authentication_failed"
    public_message = "Request authentication failed."


class RequestValidationError(AgentError):
    code = "invalid_request"
    public_message = "The update request is invalid."


class ManifestVerificationError(AgentError):
    code = "manifest_verification_failed"
    public_message = "The release manifest could not be verified."


class UpdateConflictError(AgentError):
    code = "update_conflict"
    public_message = "Another update is already active."


class AdapterError(AgentError):
    code = "provider_operation_failed"
    public_message = "The deployment provider operation failed."

