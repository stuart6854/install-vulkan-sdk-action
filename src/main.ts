import * as cache from '@actions/cache'
import * as core from '@actions/core'
import * as downloader from './downloader'
import * as input from './inputs'
import * as installer from './installer'
import * as path from 'path'
import * as platform from './platform'
import * as tc from '@actions/tool-cache'
import * as version_getter from './versiongetter'
import * as fs from 'fs'

async function get_vulkan_sdk(
  version: string,
  destination: string,
  optional_components: string[],
  use_cache: boolean
): Promise<string> {
  let install_path: string
  let ver = await version_getter.resolve_version(version)

  const cacheKey = `vulkan-sdk-${version}-${platform.OS_PLATFORM}-${platform.OS_ARCH}`

  // restore from cache
  if (use_cache) {
    let restoredFromCache = undefined
    restoredFromCache = await cache.restoreCache([destination], cacheKey)
    if (restoredFromCache !== undefined) {
      core.info(`🎯 Found cached Vulkan SDK '${ver}' in path: ${destination}`)
      core.addPath(destination)
      return destination
    }
  }

  // download + install
  const vulkan_sdk_path = await downloader.download_vulkan_sdk(ver)
  install_path = await installer.install_vulkan_sdk(vulkan_sdk_path, destination, ver, optional_components)

  // cache install folder
  if (use_cache) {
    try {
      await cache.saveCache([install_path], cacheKey)
    } catch (error: any) {
      core.warning(error)
    }
  }

  return install_path
}

async function get_vulkan_runtime(version: string, destination: string, use_cache: boolean): Promise<string> {
  let install_path: string
  let ver = await version_getter.resolve_version(version)

  const cacheKey = `vulkan-rt-${version}-${platform.OS_PLATFORM}-${platform.OS_ARCH}`

  // restore from cache
  if (use_cache) {
    let restoredFromCache = undefined
    restoredFromCache = await cache.restoreCache([destination], cacheKey)
    if (restoredFromCache !== undefined) {
      core.info(`🎯 Found cached Vulkan Runtime '${ver}' in path: ${destination}`)
      core.addPath(destination)
      return destination
    }
  }

  // download + install
  const vulkan_runtime_path = await downloader.download_vulkan_runtime(ver)
  install_path = await installer.install_vulkan_runtime(vulkan_runtime_path, destination)

  // cache install folder
  if (use_cache) {
    try {
      await cache.saveCache([install_path], cacheKey)
    } catch (error: any) {
      core.warning(error)
    }
  }

  return install_path
}

async function run(): Promise<void> {
  try {
    const inputs: input.Inputs = await input.getInputs()

    const version = await version_getter.resolve_version(inputs.version)

    const sdk_path = await get_vulkan_sdk(version, inputs.destination, inputs.optional_components, inputs.use_cache)

    const sdk_versionized_path = path.normalize(`${sdk_path}/${version}`)

    core.addPath(`${sdk_versionized_path}`)
    core.info(`✔️ [PATH] Added path to Vulkan SDK to environment variable PATH.`)

    core.exportVariable('VULKAN_SDK', `${sdk_versionized_path}`)
    core.info(`✔️ [ENV] Set env variable VULKAN_SDK -> "${sdk_versionized_path}".`)

    core.exportVariable('VULKAN_VERSION', `${version}`)
    core.info(`✔️ [ENV] Set env variable VULKAN_VERSION -> "${version}".`)

    core.setOutput('VULKAN_VERSION', version)

    if (inputs.install_runtime /*&& platform.IS_WINDOWS*/) {
      const install_path = await get_vulkan_runtime(version, inputs.destination, inputs.use_cache)

      core.info(`✔️ [INFO] Path to Vulkan Runtime: ${install_path}`)
    }
  } catch (error: any) {
    let errorMessage = 'ErrorMessage'
    if (error instanceof Error) {
      errorMessage = error.message
    }
    core.error(errorMessage)
  }
}

run()
