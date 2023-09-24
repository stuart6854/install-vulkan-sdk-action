import * as core from '@actions/core'
import * as http from './http'
import * as platform from './platform'

// Vulkan SDK Version Query and Download API
// https://vulkan.lunarg.com/content/view/latest-sdk-version-api

/**
 * Latest Version Response.
 *
 * @see https://vulkan.lunarg.com/sdk/versions.json
 *
 * @interface LatestVersionResponse
 */
interface LatestVersionResponse {
  windows: string
  linux: string
  mac: string
}

/**
 * Get a list of all available SDK versions.
 *
 * @see https://vulkan.lunarg.com/sdk/versions.json (version list regardless of platform)
 * @see https://vulkan.lunarg.com/sdk/versions/${PLATFORM_NAME}.json
 *
 * @interface AvailableVersions
 */
interface AvailableVersions {
  versions: string[]
}

/**
 * Get list of all available versions for this platform.
 *
 * @export
 * @return {*}  {(Promise<AvailableVersions | null>)}
 */
export const getAvailableVersions = async (): Promise<AvailableVersions | null> => {
  const platformName = platform.getPlatform()
  const url = `https://vulkan.lunarg.com/sdk/versions/${platformName}.json`
  const response = await http.client.getJson<AvailableVersions>(url)
  if (!response.result) {
    throw new Error(`Unable to retrieve the list of all available VULKAN SDK versions from '${url}'`)
  }
  return response.result
}
/**
 * Get the list of latest versions.
 *
 * @export
 * @return {*}  {(Promise<LatestVersionResponse | null>)}
 */
export const getLatestVersions = async (): Promise<LatestVersionResponse | null> => {
  const url = `https://vulkan.lunarg.com/sdk/latest.json`
  const response = await http.client.getJson<LatestVersionResponse>(url)
  if (!response.result) {
    throw new Error(`Unable to retrieve the latest version information from '${url}'`)
  }
  return response.result
}

/**
 * resolve_version
 *
 * This function resolves the string literal "latest" to the latest version number.
 * "latest" might be set by the user or during input validation, when the version field is empty.
 * The version to download is either
 *    a) a manually passed in version (pass-through)
 * or b) the automatically resolved latest version for the platform.
 *
 * @export
 * @param {string} version
 * @return {*}  {Promise<string>}
 */
export async function resolve_version(version: string): Promise<string> {
  let versionToDownload: string = version
  if (version === 'latest') {
    try {
      const latestVersion: LatestVersionResponse | null = await getLatestVersions()
      if (latestVersion !== null) {
        versionToDownload = getLatestVersionForPlatform(latestVersion)
        core.info(`Latest Version: ${versionToDownload}`)
      }
    } catch (error) {
      let errorMessage = 'Failed to resolve_version()'
      if (error instanceof Error) {
        errorMessage = error.message
      }
      core.setFailed(errorMessage)
    }
  }
  return versionToDownload
}

/**
 * get latest version for platform.
 * they might have a different latest version! ¯\\_(ツ)_/¯
 *
 * @param {LatestVersionResponse} latestVersion
 * @return {*}  {string}
 */
function getLatestVersionForPlatform(latestVersion: LatestVersionResponse): string {
  if (platform.IS_WINDOWS) {
    return latestVersion.windows
  }
  if (platform.IS_LINUX) {
    return latestVersion.linux
  }
  if (platform.IS_MAC) {
    return latestVersion.mac
  }
  return ''
}
