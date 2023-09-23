import * as cache from '@actions/cache'
import * as core from '@actions/core'
import * as downloader from './downloader'
import * as input from './inputs'
import * as installer from './installer'
import * as path from 'path'
import * as platform from './platform'
import * as version_getter from './versiongetter'

async function get_vulkan_sdk(
  version: string,
  destination: string,
  optional_components: string[],
  use_cache: boolean
): Promise<string> {
  let install_path: string

  // "cache-vulkan-sdk-1.3.250.1-linux-x64"
  // note: getPlatform() is used to get "windows", instead of OS_PLATFORM value "win32"
  const cachePrimaryKey = `cache-vulkan-sdk-${version}-${platform.getPlatform()}-${platform.OS_ARCH}`

  // restore from cache
  if (use_cache) {
    let restoredFromCacheId = undefined

    restoredFromCacheId = await cache.restoreCache([destination], cachePrimaryKey)

    if (restoredFromCacheId === undefined) {
      core.info(`🎯 [Cache] Cache for 'Vulkan SDK' not found.`)
    } else {
      core.info(
        `🎯 [Cache] Restored Vulkan SDK '${version}' in path: '${destination}'. Cache Restore ID: '${restoredFromCacheId}'.`
      )

      return destination // Exit early with the cached destination, e.g. C:\VulkanSDK
    }
  }

  // download + install
  // if use_cache = false (cache is not used)
  // if use_cache = true && cacheKey = false (cache is used, but not found)
  const vulkan_sdk_path = await downloader.download_vulkan_sdk(version)
  install_path = await installer.install_vulkan_sdk(vulkan_sdk_path, destination, version, optional_components)

  // cache install folder
  if (use_cache) {
    try {
      const cacheId = await cache.saveCache([install_path], cachePrimaryKey)
      if (cacheId != -1) {
        core.info(`🎯 [Cache] Saved Vulkan SDK '${version}' in path: '${install_path}'. Cache Save ID: '${cacheId}'.`)
      }
    } catch (error: any) {
      core.warning(error)
    }
  }

  return install_path
}

async function get_vulkan_runtime(version: string, destination: string, use_cache: boolean): Promise<string> {
  let install_path: string

  // "cache-vulkan-sdk-1.3.250.1-windows-x64"
  // note: getPlatform() is used to get "windows", instead of OS_PLATFORM value "win32"
  const cacheKey = `cache-vulkan-rt-${version}-${platform.getPlatform()}-${platform.OS_ARCH}`

  // restore from cache
  if (use_cache) {
    let restoredFromCacheId = undefined
    restoredFromCacheId = await cache.restoreCache([destination], cacheKey)

    if (restoredFromCacheId === undefined) {
      core.info(`🎯 [Cache] Cache for 'Vulkan Runtime' not found.`)
    } else {
      core.info(
        `🎯 [Cache] Restored Vulkan Runtime '${version}' in path: '${destination}'. Cache Restore ID: '${restoredFromCacheId}'.`
      )

      return destination // Exit early with the cached destination
    }
  }

  // download + install
  const vulkan_runtime_path = await downloader.download_vulkan_runtime(version)
  install_path = await installer.install_vulkan_runtime(vulkan_runtime_path, destination)

  // cache install folder
  if (use_cache) {
    try {
      const cacheId = await cache.saveCache([install_path], cacheKey)
      core.info(`🎯 [Cache] Saved Vulkan Runtime '${version}' in path: '${install_path}'. Cache Save ID: '${cacheId}'.`)
    } catch (error: any) {
      core.warning(error)
    }
  }

  return install_path
}

/**
 * Prints errors to the GitHub Actions console.
 * Lets action exit with exit code 1.
 */
function errorHandler(error: Error): void {
  let message = error.stack || error.message || String(error)
  core.setFailed(message)
}

async function run(): Promise<void> {
  try {
    const inputs: input.Inputs = await input.getInputs()

    const version = await version_getter.resolve_version(inputs.version)

    const sdk_path = await get_vulkan_sdk(version, inputs.destination, inputs.optional_components, inputs.use_cache)

    // let install_path be a versionized path to the SDK
    let install_path = sdk_path
    if (!sdk_path.includes(version)) {
      install_path = path.normalize(`${sdk_path}/${version}`)
    }

    if (installer.verify_installation_of_sdk(install_path)) {
      // Setup Paths to the Vulkan SDK
      //
      // https://vulkan.lunarg.com/doc/sdk/1.3.261.1/linux/getting_started.html#set-up-the-runtime-environment
      //
      // According to the docs one would "source ~/vulkan/1.x.yy.z/setup-env.sh".
      // But here we setup our paths by setting these environment variables ourself.
      // We set PATH, VULKAN_SDK, VK_LAYER_PATH, LD_LIBRARY_PATH and additionally VULKAN_VERSION.

      // export PATH=$VULKAN_SDK/bin:$PATH
      core.addPath(`${install_path}`)
      core.info(`✔️ [PATH] Added path to Vulkan SDK to environment variable PATH.`)

      // export VULKAN_SDK=~/vulkan/1.x.yy.z/x86_64
      core.exportVariable('VULKAN_SDK', install_path)
      core.info(`✔️ [ENV] Set env variable VULKAN_SDK -> "${install_path}".`)

      core.exportVariable('VULKAN_VERSION', version)
      core.info(`✔️ [ENV] Set env variable VULKAN_VERSION -> "${version}".`)

      if (platform.IS_LINUX) {
        // export VK_LAYER_PATH=$VULKAN_SDK/etc/vulkan/explicit_layer.d
        const vk_layer_path = `${install_path}/etc/vulkan/explicit_layer.d`
        core.exportVariable('VK_LAYER_PATH', vk_layer_path)
        core.info(`✔️ [ENV] Set env variable VK_LAYER_PATH -> "${vk_layer_path}".`)

        // export LD_LIBRARY_PATH=$VULKAN_SDK/lib${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}
        const ld_library_path = process.env.LD_LIBRARY_PATH || ''
        const vk_ld_library_path = `${install_path}/lib:${ld_library_path}`
        core.exportVariable('LD_LIBRARY_PATH', vk_ld_library_path)
        core.info(`✔️ [ENV] Set env variable LD_LIBRARY_PATH -> "${vk_ld_library_path}".`)
      }
    } else {
      core.warning(`Could not find Vulkan SDK in ${install_path}`)
    }

    if (inputs.install_runtime && platform.IS_WINDOWS) {
      const install_path = await get_vulkan_runtime(version, inputs.destination, inputs.use_cache)
      if (installer.verify_installation_of_runtime(install_path)) {
        core.info(`✔️ [INFO] Path to Vulkan Runtime: ${install_path}`)
      } else {
        core.warning(`Could not find Vulkan Runtime in ${install_path}`)
      }
    }
  } catch (error: any) {
    errorHandler(error as Error)
  }
}

run()
