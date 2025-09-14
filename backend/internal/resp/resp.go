package resp

type Envelope struct {
	Data  any    `json:"data,omitempty"`
	Error *Error `json:"error,omitempty"`
}

type Error struct {
	Code    string `json:"code"`
	Message string `json:"message"`
	Details any    `json:"details,omitempty"`
}

func Data(d any) Envelope {
	return Envelope{Data: d}
}

func Err(code, msg string, details any) Envelope {
	return Envelope{Error: &Error{Code: code, Message: msg, Details: details}}
}
