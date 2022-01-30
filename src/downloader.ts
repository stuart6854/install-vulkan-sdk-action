import * as core from '@actions/core'
import * as http from './http'
import * as io from '@actions/io'
import * as path from 'path'
import * as platform from './platform'
import * as tc from '@actions/tool-cache'
import {exec} from '@actions/exec'

interface Download {
  version: string
  url: string
}

export const getUrl_VulkanSDK = async (version: string): Promise<Download> => {
  const platformName = platform.getPlatform()

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

  // test, if URL is downloadable
  const statusCode = (await http.client.head(VULKAN_SDK_URL)).message.statusCode
  //if (statusCode !== 200) {
  if (statusCode !== undefined && statusCode >= 400) {
    const errorMessage = `❌ VULKAN_SDK was not found for version: ${version} using URL: ${VULKAN_SDK_URL}`
    core.setFailed(errorMessage)
    throw new Error(errorMessage)
  }

  core.info(`✔️ [VULKAN_SDK] Version found: ${version}`)

  return {version: version, url: VULKAN_SDK_URL}
}

// vulkan-runtime-components is a windows specific download shipping "vulkan-1.dll" for x86 and x64.
export const getUrl_VulkanRuntime = async (version: string): Promise<Download> => {
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

  return {version: version, url: VULKAN_RUNTIME_URL}
}

export async function download_VulkanSDK(sdk_download: Download): Promise<string> {
  // download Vulkan SDK installer
  let sdk_download_path: string
  try {
    core.info(`🔽 Downloading Vulkan SDK ${sdk_download.version}...`)
    sdk_download_path = await tc.downloadTool(sdk_download.url)
    core.debug(`Downloaded to ${sdk_download_path}`)
  } catch (error) {
    throw error
  }

  // rename Vulkan SDK installer (remove version from filename)
  core.info(`- Renaming downloaded file...`)
  const filename: string = getFilename_VulkanSDK()
  const base_path = path.basename(sdk_download_path)
  const sdk_filepath = path.join(base_path, filename)
  await io.mv(sdk_download_path, sdk_filepath)

  if (platform.IS_LINUX || platform.IS_MAC) {
    core.info(`- Fixing file permissions...`)
    await exec('chmod', ['+x', sdk_filepath])
  }

  core.info(`✔️ Vulkan SDK Installer ${sdk_download.version} downloaded successfully!`)
  core.debug(`Path to installer is ${sdk_filepath}`)

  return sdk_filepath
}

export async function download_VulkanRuntime(runtime_download: Download): Promise<string> {
  let runtime_download_path: string
  try {
    core.info(`🔽 Downloading Vulkan Runtime ${runtime_download.version}...`)
    runtime_download_path = await tc.downloadTool(runtime_download.url)
  } catch (error) {
    throw error
  }

  core.info(`✔️ Vulkan Runtime ${runtime_download.version} downloaded successfully!`)
  core.debug(`Path to runtime is ${runtime_download_path}`)

  return runtime_download_path
}

export async function download(version: string): Promise<string> {
  const sdk_download = await getUrl_VulkanSDK(version)
  const sdk_download_path = await download_VulkanSDK(sdk_download)
  const sdk_cachePath: string = await tc.cacheDir(sdk_download_path, 'vulkan_sdk', version, platform.OS_ARCH)
  core.addPath(sdk_cachePath)

  if (platform.IS_WINDOWS) {
    const runtime_download = await getUrl_VulkanRuntime(version)
    const runtime_download_path = await download_VulkanRuntime(runtime_download)
    const runtime_cachePath: string = await tc.cacheDir(runtime_download_path, 'vulkan_runtime', platform.OS_ARCH)
    core.addPath(runtime_cachePath)
  }

  core.info(`✅ Vulkan SDK ${sdk_download.version} downloaded successfully!`)

  return sdk_download_path
}

function getFilename_VulkanSDK(): string {
  // return the platform-based non-versionized filename
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
