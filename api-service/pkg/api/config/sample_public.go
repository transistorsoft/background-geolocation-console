//go:build !admin

package config

import _ "embed"

//go:embed server_sample_public.toml
var sampleConfig []byte

// SampleConfig returns a copy of the starter server configuration template.
func SampleConfig() []byte {
	buf := make([]byte, len(sampleConfig))
	copy(buf, sampleConfig)
	return buf
}
