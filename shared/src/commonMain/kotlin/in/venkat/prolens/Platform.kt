package `in`.venkat.prolens

interface Platform {
    val name: String
}

expect fun getPlatform(): Platform