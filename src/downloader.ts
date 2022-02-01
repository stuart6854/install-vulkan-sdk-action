import * as core from '@actions/core'
import * as http from './http'
import * as io from '@actions/io'
import * as path from 'path'
import * as platform from './platform'
import * as tc from '@actions/tool-cache'

// return download object with version and url
export async function get_url_vulkan_sdk(version: string): Promise<string> {
  const platformName = platform.getPlatform()

  const DOWNLOAD_BASE_URL = `https://sdk.lunarg.com/sdk/download/${version}/${platformName}`

  let VULKAN_SDK_URL = ''

  if (platform.IS_WINDOWS) {
    VULKAN_SDK_URL = `${DOWNLOAD_BASE_URL}/VulkanSDK-Installer-${version}.exe`
  }
  if (platform.IS_LINUX) {
    VULKAN_SDK_URL = `${DOWNLOAD_BASE_URL}/vulkansdk-linux-x86_64-${version}.tar.gz`
  }
  if (platform.IS_MAC) {
    VULKAN_SDK_URL = `${DOWNLOAD_BASE_URL}/vulkansdk-macos-${version}.dmg`
  }

  // test, if URL is downloadable
  const statusCode = (await http.client.head(VULKAN_SDK_URL)).message.statusCode
  //if (statusCode !== 200) {
  if (statusCode !== undefined && statusCode >= 400) {
    const errorMessage = `❌ VULKAN_SDK was not found for version: ${version} using URL: ${VULKAN_SDK_URL}`
    core.setFailed(errorMessage)
    throw new Error(errorMessage)
  }

  core.info(`✔️ [VULKAN_SDK] Version found: ${version}`)

  return VULKAN_SDK_URL
}

// vulkan-runtime-components is a windows specific download shipping "vulkan-1.dll" for x86 and x64.
export async function get_url_vulkan_runtime(version: string): Promise<string> {
  const VULKAN_RUNTIME_URL = `https://sdk.lunarg.com/sdk/download/${version}/windows/vulkan-runtime-components.zip`

  // test, if URL is downloadable
  const statusCode = (await http.client.head(VULKAN_RUNTIME_URL)).message.statusCode
  //if (statusCode !== 200) {
  if (statusCode !== undefined && statusCode >= 400) {
    const errorMessage = `❌ VULKAN_RUNTIME was not found for version: ${version} using URL: ${VULKAN_RUNTIME_URL}`
    core.setFailed(errorMessage)
    throw new Error(errorMessage)
  }

  core.info(`✔️ [VULKAN_RUNTIME] Version found: ${version}`)

  return VULKAN_RUNTIME_URL
}

// returns sdk_installer_cache_path
export async function download_vulkan_sdk(version: string): Promise<string> {
  let sdk_download_path: string
  try {
    core.info(`🔽 Downloading Vulkan SDK ${version} ...`)
    const url = await get_url_vulkan_sdk(version)
    sdk_download_path = await tc.downloadTool(url)
    core.debug(`Downloaded to ${sdk_download_path}`)
  } catch (error) {
    throw error
  }

  core.info(`✔️ Vulkan SDK Installer ${version} downloaded successfully!`)
  core.debug(`Path to installer is ${sdk_download_path}`)

  // cache
  const versionized_filename = path.basename(sdk_download_path)
  const sdk_installer_cache_path = tc.cacheFile(sdk_download_path, versionized_filename, 'vulkan-sdk', version)
  core.debug(`Path to cached installer is ${sdk_installer_cache_path}`)

  // return path to cached file; and not sdk_download_path !
  return sdk_installer_cache_path
}

export async function download_vulkan_runtime(version: string): Promise<string> {
  let runtime_download_path: string
  try {
    core.info(`🔽 Downloading Vulkan Runtime ${version}...`)
    const url = await get_url_vulkan_runtime(version)
    runtime_download_path = await tc.downloadTool(url)
  } catch (error) {
    throw error
  }

  // cache
  const filename = get_versionized_filename_vulkan_runtime(version)
  const runtime_cache_path = tc.cacheFile(runtime_download_path, filename, 'vulkan-runtime', version)

  core.info(`✔️ Vulkan Runtime ${version} downloaded successfully!`)
  core.debug(`Path to runtime is ${runtime_cache_path}`)

  return runtime_cache_path
}

// return the platform-based (windows-only) versionized filename
function get_versionized_filename_vulkan_runtime(version: string): string {
  return `vulkan-runtime-components-${version}.zip`
}
