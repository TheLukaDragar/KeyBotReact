import { getCurrentPositionAsync, getLastKnownPositionAsync, LocationAccuracy, LocationObject } from 'expo-location'
import { Platform } from 'react-native'

let cachedLocation: LocationObject | null = null
let cacheTimestamp: number | null = null
const CACHE_DURATION = 3 * 60 * 1000 // 5 minutes in milliseconds

function delay(timeInMilliseconds: number) {
    return new Promise<null>((resolve) => {
        setTimeout(() => resolve(null), timeInMilliseconds)
    })
}

export async function getLocation(fresh = false) {
    console.log('getting location')
    const ANDROID_DELAY_IN_MS = 4 * 1000 // 4s
    const IOS_DELAY_IN_MS = 15 * 1000 // 15s

    const DELAY_IN_MS =
        Platform.OS === 'ios' ? IOS_DELAY_IN_MS : ANDROID_DELAY_IN_MS

    const MAX_TRIES = 10
    let tries = 1


    //if null do not return cached location
    if (cachedLocation && cacheTimestamp && Date.now() - cacheTimestamp < CACHE_DURATION && cachedLocation.coords.latitude !== null && cachedLocation.coords.longitude !== null && !fresh
    ) {
        console.log('returning cached location', JSON.stringify(cachedLocation))
        return cachedLocation
    }

    let location: LocationObject | null = null
    let locationError: Error | null = null

    if (!fresh) {
        // Try to get the last known location first
        try {
            location = await getLastKnownPositionAsync(
                {
                    maxAge: 5 * 60 * 1000, // 5 minutes in milliseconds
                    requiredAccuracy: LocationAccuracy.BestForNavigation,
                },

            )

        } catch (err) {
            console.log('last known location error', err)
            locationError = err as Error
        }

        if (location) {
            console.log('returning last known location', JSON.stringify(location))
            return location
        }
    }



    if (!location) {
        do {
            try {
                location = await Promise.race([
                    delay(DELAY_IN_MS),
                    getCurrentPositionAsync({
                        accuracy: LocationAccuracy.BestForNavigation,
                        distanceInterval: 0,
                    }),
                ])

                if (!location) {
                    throw new Error('Timeout')
                }
            } catch (err) {
                console.log('location error', err)
                locationError = err as Error
            } finally {
                tries += 1
            }
        } while (!location && tries <= MAX_TRIES)
    }

    if (!location) {
        alert('Unable to get location. Please try again later.')
        const error = locationError ?? new Error('💣')
        throw error
    }

    cachedLocation = location
    cacheTimestamp = Date.now()

    setTimeout(() => {
        cachedLocation = null
        cacheTimestamp = null
    }, CACHE_DURATION)

    return location
}