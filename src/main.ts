import * as core from '@actions/core'
import * as downloader from './downloader'
import * as input from './inputs'
import * as installer from './installer'
import * as path from 'path'
import * as platform from './platform'
import * as tc from '@actions/tool-cache'
import * as cache from '@actions/cache'
import * as version_getter from './versiongetter'
import {debug} from 'console'
import {execSync} from 'child_process'
import * as fs from 'fs'

function show_cache(): void {
  const testFolder = '/opt/hostedtoolcache/vulkan_sdk'
  fs.readdirSync(testFolder).forEach(file => {
    core.info(file)
  })
  core.info(`🔎 Show Cache`)
  const cachedVersions = tc.findAllVersions('vulkan_sdk', platform.OS_ARCH)
  if (cachedVersions.length !== 0) {
    core.info(`🎯 Cached versions of Vulkan SDK available: ${cachedVersions}`)
  }
}

async function get_vulkan_sdk(version: string, destination: string, use_cache: boolean): Promise<string> {
  if (use_cache) {
    show_cache()
    let cached_install_path = tc.find('vulkan_sdk', version, platform.OS_ARCH)
    if (cached_install_path) {
      core.info(`🎯 Found cached Vulkan SDK in path: ${cached_install_path}`)
      // path.resolve(path.join(cached_install_path, 'vulkan-sdk')
      core.addPath(cached_install_path)
      return cached_install_path
    }
  }
  const vulkan_sdk_path = await downloader.download_vulkan_sdk(version)
  const install_path = await installer.install_vulkan_sdk(vulkan_sdk_path, destination, version)
  return install_path
}

async function get_vulkan_runtime(version: string, destination: string, use_cache: boolean): Promise<string> {
  if (use_cache) {
    let cached_install_path = tc.find('vulkan_runtime', version, platform.OS_ARCH)
    if (cached_install_path) {
      core.addPath(cached_install_path)
      core.info(`🎯 Found cached Vulkan SDK '${version}' in path: ${cached_install_path}`)
      return cached_install_path
    }
  }
  const runtime_archive_path = await downloader.download_vulkan_runtime(version)
  const install_path = await installer.install_vulkan_runtime(runtime_archive_path, destination)
  return install_path
}

async function run(): Promise<void> {
  try {
    const inputs: input.Inputs = await input.getInputs()

    const version = await version_getter.resolve_version(inputs.version)

    const sdk_installer_path = await get_vulkan_sdk(version, inputs.destination, inputs.use_cache)

    const installation_path = await installer.install_vulkan_sdk(sdk_installer_path, inputs.destination, version)
    /*
    core.addPath(`${installation_path}`)
    core.info(`✔️ [PATH] Added path to Vulkan SDK to environment variable PATH.`)

    core.exportVariable('VULKAN_SDK', `${installation_path}`)
    core.info(`✔️ [VULKAN_SDK] Added environment variable VULKAN_SDK -> "${installation_path}".`)

    core.exportVariable('VULKAN_VERSION', `${version}`)
    core.info(`✔️ [VULKAN_VERSION] Added environment variable VULKAN_VERSION -> "${version}".`)

    core.setOutput('VULKAN_VERSION', version)*/

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
