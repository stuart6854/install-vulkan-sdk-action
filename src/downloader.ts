import * as core from '@actions/core'
import * as http from './http'
import * as io from '@actions/io'
import * as path from 'path'
import * as platform from './platform'
import * as tc from '@actions/tool-cache'

// return download object with version and url
export async function get_url_vulkan_sdk(version: string): Promise<string> {
  const platformName = platform.getPlatform()

  // for download urls see https://vulkan.lunarg.com/sdk/home

  const DOWNLOAD_BASE_URL = `https://sdk.lunarg.com/sdk/download/${version}/${platformName}`

  let VULKAN_SDK_URL = ''

  if (platform.IS_WINDOWS) {
    VULKAN_SDK_URL = `${DOWNLOAD_BASE_URL}/VulkanSDK-${version}-Installer.exe`
  }
  if (platform.IS_LINUX) {
    VULKAN_SDK_URL = `${DOWNLOAD_BASE_URL}/vulkansdk-linux-x86_64-${version}.tar.gz`
  }
  if (platform.IS_MAC) {
    VULKAN_SDK_URL = `${DOWNLOAD_BASE_URL}/vulkansdk-macos-${version}.dmg`
  }

  is_downloadable('VULKAN_SDK', version, VULKAN_SDK_URL)

  return VULKAN_SDK_URL
}

// vulkan-runtime-components is a windows specific download shipping "vulkan-1.dll" for x86 and x64.
export async function get_url_vulkan_runtime(version: string): Promise<string> {
  const VULKAN_RUNTIME_URL = `https://sdk.lunarg.com/sdk/download/${version}/windows/vulkan-runtime-components.zip`
  is_downloadable('VULKAN_RUNTIME', version, VULKAN_RUNTIME_URL)
  return VULKAN_RUNTIME_URL
}

async function is_downloadable(name: string, version: string, url: string) {
  // test, if URL is downloadable
  const statusCode = (await http.client.head(url)).message.statusCode
  //if (statusCode !== 200) {
  if (statusCode !== undefined && statusCode >= 400) {
    const errorMessage = `❌ ${name} was not found for version: ${version} using URL: ${url}`
    core.setFailed(errorMessage)
    throw new Error(errorMessage)
  }
  core.info(`✔️ The requested ${name} version was found: ${version}`)
}

export async function download_vulkan_sdk(version: string): Promise<string> {
  const url = await get_url_vulkan_sdk(version)
  core.info(`🔽 Downloading Vulkan SDK ${version}`)
  const sdk_download_path = await tc.downloadTool(url)
  core.info(`✔️ Downloaded successfull!`)
  core.info(`Path to installer file: ${sdk_download_path}`)
  return sdk_download_path
}

export async function download_vulkan_runtime(version: string): Promise<string> {
  const url = await get_url_vulkan_runtime(version)
  core.info(`🔽 Downloading Vulkan Runtime ${version}`)
  const runtime_download_path = await tc.downloadTool(url)
  core.info(`✔️ Downloaded successfull!`)
  core.info(`Path to runtime file: ${runtime_download_path}`)
  return runtime_download_path
}

function get_non_versionized_filename_vulkan_sdk(): string {
  if (platform.IS_WINDOWS) {
    return `VulkanSDK-Installer.exe`
  }
  if (platform.IS_LINUX) {
    return `vulkansdk-linux-x86_64.tar.gz`
  }
  if (platform.IS_MAC) {
    return `vulkansdk-macos.dmg`
  }
  return ''
}

// return the platform-based (windows-only) versionized filename
function get_versionized_filename_vulkan_runtime(version: string): string {
  return `vulkan-runtime-components-${version}.zip`
}
