package resp

type Response struct {
	Data  any       `json:"data,omitempty"`
	Error *APIError `json:"error,omitempty"`
}

type APIError struct {
	Code    string      `json:"code"`
	Message string      `json:"message"`
	Details interface{} `json:"details,omitempty"`
}

func Data(v any) Response {
	return Response{Data: v}
}

func Err(code, msg string, details interface{}) Response {
	return Response{Error: &APIError{Code: code, Message: msg, Details: details}}
}
