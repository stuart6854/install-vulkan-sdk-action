import * as core from '@actions/core'
import * as fs from 'fs'
import * as platform from './platform'
import * as tc from '@actions/tool-cache'
import * as path from 'path'
import {execSync} from 'child_process'

/**
 * Install the Vulkan SDK.
 *
 * @param sdk_path - Path to the Vulkan SDK installer executable.
 * @param destination - Installation destination path.
 * @param version - Vulkan SDK version.
 * @param optional_components - Array of optional components to install.
 * @returns Promise<string> - Installation path.
 */
export async function install_vulkan_sdk(
  sdk_path: string,
  destination: string,
  version: string,
  optional_components: string[]
): Promise<string> {
  let install_path = ''

  core.info(`📦 Extracting Vulkan SDK...`)

  if (platform.IS_MAC) {
    install_path = await install_vulkan_sdk_mac(sdk_path, destination, version, optional_components)
  } else if (platform.IS_LINUX) {
    install_path = await install_vulkan_sdk_linux(sdk_path, destination, version, optional_components)
  } else if (platform.IS_WINDOWS) {
    install_path = await install_vulkan_sdk_windows(sdk_path, destination, version, optional_components)
  }

  core.info(`   Installed into folder: ${install_path}`)
  core.addPath(install_path)

  return install_path
}

/**
 * Install the Vulkan SDK on a Linux system.
 *
 * @param sdk_path - Path to the Vulkan SDK installer executable.
 * @param destination - Installation destination path.
 * @param version - Vulkan SDK version.
 * @param optional_components - Array of optional components to install.
 * @returns Promise<string> - Installation path.
 */
export async function install_vulkan_sdk_linux(
  sdk_path: string,
  destination: string,
  version: string,
  optional_components: string[]
): Promise<string> {
  let install_path = await extract_archive(sdk_path, destination)

  return install_path
}

/**
 * Install the Vulkan SDK on a MAC system.
 *
 * @param sdk_path - Path to the Vulkan SDK installer executable.
 * @param destination - Installation destination path.
 * @param version - Vulkan SDK version.
 * @param optional_components - Array of optional components to install.
 * @returns Promise<string> - Installation path.
 */
export async function install_vulkan_sdk_mac(
  sdk_path: string,
  destination: string,
  version: string,
  optional_components: string[]
): Promise<string> {
  let install_path = ''

  // https://vulkan.lunarg.com/doc/view/1.2.189.0/mac/getting_started.html
  // TODO
  // 1. mount dmg
  //    local mountpoint=$(hdiutil attach vulkan_sdk.dmg | grep -i vulkansdk | awk 'END {print $NF}')
  // 2. build installer cmd
  //    sudo ./InstallVulkan.app/Contents/MacOS/InstallVulkan --root "installation path" --accept-licenses --default-answer --confirm-command install

  return install_path
}

/**
 * Install the Vulkan SDK on a Windows system.
 *
 * @param sdk_path - Path to the Vulkan SDK installer executable.
 * @param destination - Installation destination path.
 * @param version - Vulkan SDK version.
 * @param optional_components - Array of optional components to install.
 * @returns Promise<string> - Installation path.
 */
export async function install_vulkan_sdk_windows(
  sdk_path: string,
  destination: string,
  version: string,
  optional_components: string[]
): Promise<string> {
  let install_path = ''

  // Warning: The installation path cannot be relative, please specify an absolute path.
  // Changing the destination to a versionzed folder "C:\VulkanSDK\1.3.250.1"
  const versionized_destination_path = path.normalize(`${destination}/${version}`)

  // concatenate arguments for Vulkan-Installer.exe
  let cmd_args = [
    '--root',
    versionized_destination_path,
    '--accept-licenses',
    '--default-answer',
    '--confirm-command',
    'install'
  ]
  let optional_components_args = optional_components.join(' ')
  let installer_args = cmd_args.join(' ').concat(optional_components_args)

  //
  // The full CLI command looks like:
  //
  // powershell.exe Start-Process
  //   -FilePath 'VulkanSDK-1.3.216.0-Installer.exe'
  //   -Args '--root C:\VulkanSDK\1.3.216.0 --accept-licenses --default-answer --confirm-command install com.lunarg.vulkan.debug'
  //   -Verb RunAs
  //
  // The installer must be run as administrator.
  const run_as_admin_cmd = `powershell.exe Start-Process -FilePath '${sdk_path}' -Args '${installer_args}' -Verb RunAs -Wait`

  core.debug(`Command: ${run_as_admin_cmd}`)

  try {
    //execSync(run_as_admin_cmd)
    let stdout: string = execSync(run_as_admin_cmd, {stdio: 'inherit'}).toString().trim()
    process.stdout.write(stdout)
  } catch (error: any) {
    core.error(error.toString())
    core.setFailed(`Installer failed. Arguments used: ${installer_args}`)
  }

  install_path = versionized_destination_path

  return install_path
}

export async function install_vulkan_runtime(runtime_path: string, destination: string): Promise<string> {
  core.info(`📦 Extracting Vulkan Runtime (➔ vulkan-1.dll) ...`)
  const runtime_destination = path.normalize(`${destination}/runtime`)
  const install_path = extract_archive(runtime_path, runtime_destination)
  return install_path
}

/**
 * Extracts an archive file to a specified destination based on the platform and file type.
 *
 * @param {string} file - The path to the archive file to be extracted.
 * @param {string} destination - The destination directory where the archive contents will be extracted.
 * @returns {Promise<string>} A Promise that resolves to the destination directory path after extraction.
 */
async function extract_archive(file: string, destination: string): Promise<string> {
  let extract = tc.extractTar // default extract method on linux: tar

  if (platform.IS_WINDOWS) {
    if (file.endsWith('.exe')) {
      // No extraction needed for .exe files
      return destination
    } else if (file.endsWith('.zip')) {
      extract = (file, destination) => tc.extractZip(file, destination)
    } else if (file.endsWith('.7z')) {
      extract = (file, destination) => tc.extract7z(file, destination)
    }
  } else if (platform.IS_MAC) {
    extract = (file, destination) => tc.extractXar(file, destination)
  }

  return await extract(file, destination)
}

function verify_installation_of_sdk(sdk_path?: string): boolean {
  let r = false
  if (platform.IS_LINUX || platform.IS_MAC) {
    r = fs.existsSync(`${sdk_path}/bin/vulkaninfo`)
  }
  if (platform.IS_WINDOWS) {
    const file = path.normalize(`${sdk_path}/bin/vulkaninfoSDK.exe`)
    r = fs.existsSync(file)
  }
  return r
}

function verify_installation_of_runtime(sdk_path?: string): boolean {
  let r = false
  if (platform.IS_WINDOWS) {
    const file = `${sdk_path}/runtime/vulkan-1.dll`
    r = fs.existsSync(file)
  }
  return r
}
