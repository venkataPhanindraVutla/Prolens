package `in`.venkat.prolens.core.model

import kotlinx.serialization.Serializable

/** Capture modes in the strip above the shutter, in strip order. Photo sits in the middle. */
@Serializable
enum class CaptureMode(val label: String) {
    Night("Night"),
    Micro("Micro"),
    Macro("Macro"),
    Photo("Photo"),
    SloMo("Slo-mo"),
    Panorama("Pano"),
    Templates("Templates"),
}
