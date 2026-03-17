package services

import "testing"

func TestDeviceDetailsDisplayName(t *testing.T) {
	tests := []struct {
		name   string
		device DeviceDetails
		want   string
	}{
		{
			name: "legacy company device id becomes model username framework",
			device: DeviceDetails{
				DeviceID:    "arm64-dlazar",
				DeviceModel: "arm64",
				Framework:   "flutter",
			},
			want: "arm64-dlazar (flutter)",
		},
		{
			name: "falls back to raw device id when no username pattern",
			device: DeviceDetails{
				DeviceID:    "custom-device",
				DeviceModel: "Pixel 8",
				Framework:   "expo",
			},
			want: "custom-device (expo)",
		},
		{
			name: "uses model when device id missing",
			device: DeviceDetails{
				DeviceModel: "dashboard",
				Framework:   "dashboard",
			},
			want: "dashboard (dashboard)",
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			if got := tc.device.DisplayName(); got != tc.want {
				t.Fatalf("DisplayName() = %q, want %q", got, tc.want)
			}
		})
	}
}
