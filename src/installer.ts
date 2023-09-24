import * as core from '@actions/core'
import * as tc from '@actions/tool-cache'
import {execSync} from 'child_process'
import * as fs from 'fs'
import * as path from 'path'
import * as platform from './platform'

/**
 * Install the Vulkan SDK.
 *
 * @export
 * @param {string} sdk_path - Path to the Vulkan SDK installer executable.
 * @param {string} destination - Installation destination path.
 * @param {string} version - Vulkan SDK version.
 * @param {string[]} optional_components - Array of optional components to install.
 * @return {*}  {Promise<string>} - Installation path.
 */
export async function install_vulkan_sdk(
  sdk_path: string,
  destination: string,
  version: string,
  optional_components: string[]
): Promise<string> {
  let install_path = ''

  // Changing the destination to a versionzed folder "C:\VulkanSDK\1.3.250.1"
  const versionized_destination_path = path.normalize(`${destination}/${version}`)

  core.info(`📦 Extracting Vulkan SDK...`)

  if (platform.IS_MAC) {
    install_path = await install_vulkan_sdk_mac(sdk_path, versionized_destination_path, optional_components)
  } else if (platform.IS_LINUX) {
    install_path = await install_vulkan_sdk_linux(sdk_path, versionized_destination_path, optional_components)
  } else if (platform.IS_WINDOWS) {
    install_path = await install_vulkan_sdk_windows(sdk_path, versionized_destination_path, optional_components)
  }

  core.info(`   Installed into folder: ${install_path}`)
  core.addPath(install_path)

  return install_path
}

/**
 * Install the Vulkan SDK on a Linux system.
 *
 * @export
 * @param {string} sdk_path - Path to the Vulkan SDK installer executable.
 * @param {string} destination - Installation destination path.
 * @param {string[]} optional_components - Array of optional components to install.
 * @return {*}  {Promise<string>} - Installation path.
 */
export async function install_vulkan_sdk_linux(
  sdk_path: string,
  destination: string,
  optional_components: string[]
): Promise<string> {
  let install_path = await extract_archive(sdk_path, destination)

  return install_path
}

/**
 * Install the Vulkan SDK on a MAC system.
 *
 * @export
 * @param {string} sdk_path - Path to the Vulkan SDK installer executable.
 * @param {string} destination - Installation destination path.
 * @param {string[]} optional_components - Array of optional components to install.
 * @return {*}  {Promise<string>} - Installation path.
 */
export async function install_vulkan_sdk_mac(
  sdk_path: string,
  destination: string,
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
 * @export
 * @param {string} sdk_path- Path to the Vulkan SDK installer executable.
 * @param {string} destination - Installation destination path.
 * @param {string[]} optional_components - Array of optional components to install.
 * @return {*}  {Promise<string>} - Installation path.
 */
export async function install_vulkan_sdk_windows(
  sdk_path: string,
  destination: string,
  optional_components: string[]
): Promise<string> {
  // Warning: The installation path cannot be relative, please specify an absolute path.
  // Changing the destination to a versionzed folder "C:\VulkanSDK\1.3.250.1"

  let cmd_args = [
    '--root',
    destination,
    '--accept-licenses',
    '--default-answer',
    '--confirm-command',
    'install',
    ...optional_components
  ]
  let installer_args = cmd_args.join(' ')

  //
  // The full CLI command looks like:
  //
  // powershell.exe Start-Process
  //  -FilePath 'C:\Users\RUNNER~1\AppData\Local\Temp\VulkanSDK-Installer.exe'
  //  -Args '--root C:\VulkanSDK\1.3.250.1 --accept-licenses --default-answer --confirm-command install com.lunarg.vulkan.vma com.lunarg.vulkan.volk'
  //  -Verb RunAs
  //  -Wait
  //
  // Important:
  // 1. The installer must be run as administrator.
  // 2. Keep the "-Wait", because the installer process needs to finish writing all files and folders be we can proceed.
  const run_as_admin_cmd = `powershell.exe Start-Process -FilePath '${sdk_path}' -Args '${installer_args}' -Verb RunAs -Wait`

  core.debug(`Command: ${run_as_admin_cmd}`)

  try {
    execSync(run_as_admin_cmd)
    //let stdout: string = execSync(run_as_admin_cmd, {stdio: 'inherit'}).toString().trim()
    //process.stdout.write(stdout)
  } catch (error: any) {
    core.error(error.toString())
    core.setFailed(`Installer failed. Arguments used: ${installer_args}`)
  }

  return destination
}

/**
 * install_vulkan_runtime
 *
 * @export
 * @param {string} runtime_path
 * @param {string} destination
 * @param {string} version
 * @return {*}  {Promise<string>}
 */
export async function install_vulkan_runtime(
  runtime_path: string,
  destination: string,
  version: string
): Promise<string> {
  /*
   Problem: extracting the zip would create a top-level folder,
   e.g.  "C:\VulkanSDK\runtime\VulkanRT-1.3.250.1-Components\".
   So, let's extract the contents of the ZIP archive to a temporary directory,
   and then copy the contents of the top-level folder within the temp dir
   to the runtime_destination without the top-level folder itself.
   Goal is to have: C:\VulkanSDK\runtime\x64\vulkan-1.dll
  */
  core.info(`📦 Extracting Vulkan Runtime (➔ vulkan-1.dll) ...`)
  // install into temp
  const temp_install_path = path.normalize(`${platform.TEMP_DIR}/vulkan-runtime`) // C:\Users\RUNNER~1\AppData\Local\Temp\vulkan-runtime
  await extract_archive(runtime_path, temp_install_path)
  // copy from temp to destination
  const top_level_folder = fs.readdirSync(temp_install_path)[0] // VulkanRT-1.3.250.1-Components
  const temp_top_level_folder_path = path.join(temp_install_path, top_level_folder) // C:\Users\RUNNER~1\AppData\Local\Temp\vulkan-runtime\VulkanRT-1.3.250.1-Components
  const versionized_destination_path = path.normalize(`${destination}/${version}`) // C:\VulkanSDK\1.3.250.1
  const install_path = path.normalize(`${versionized_destination_path}/runtime`) // C:\VulkanSDK\1.3.250.1\runtime
  copy_folder(temp_top_level_folder_path, install_path)
  fs.rmSync(temp_install_path, {recursive: true})
  return install_path
}

/**
 * Extracts an archive file to a specified destination based on the platform and file type.
 *
 * @param {string} file - The path to the archive file to be extracted.
 * @param {string} destination - The destination directory where the archive contents will be extracted.
 * @return {*}  {Promise<string>} A Promise that resolves to the destination directory path after extraction.
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

/**
 * verify_installation_of_sdk
 *
 * @export
 * @param {string} sdk_install_path - The installation path of the Vulkan SDK, e.g. "C:\VulkanSDK\1.3.250.1".
 * @return {*}  {boolean}
 */
export function verify_installation_of_sdk(sdk_install_path: string): boolean {
  let r = false
  let file = `${sdk_install_path}/bin/vulkaninfo`
  if (platform.IS_LINUX || platform.IS_MAC) {
    file = `${sdk_install_path}/x86_64/bin/vulkaninfo`
  }
  if (platform.IS_WINDOWS) {
    file = path.normalize(`${sdk_install_path}/bin/vulkaninfoSDK.exe`)
  }
  r = fs.existsSync(file)
  return r
}

/**
 * verify_installation_of_runtime
 *
 * @export
 * @param {string} sdk_install_path - The installation path of the Vulkan SDK, e.g. "C:\VulkanSDK\1.3.250.1".
 * @return {*}  {boolean}
 */
export function verify_installation_of_runtime(sdk_install_path: string): boolean {
  let r = false
  if (platform.IS_WINDOWS) {
    const file = `${sdk_install_path}/runtime/x64/vulkan-1.dll`
    r = fs.existsSync(file)
  }
  return r
}

/**
 * stripdown_installation_of_sdk
 *
 * @export
 * @param {string} sdk_install_path - The installation path of the Vulkan SDK, e.g. "C:\VulkanSDK\1.3.250.1".
 */
export function stripdown_installation_of_sdk(sdk_install_path: string): void {
  core.info(`✂ Reducing Vulkan SDK size before caching`)
  if (platform.IS_WINDOWS) {
    let folders_to_delete: string[] = []
    folders_to_delete = [
      `${sdk_install_path}\\Demos`,
      `${sdk_install_path}\\Helpers`,
      `${sdk_install_path}\\installerResources`,
      `${sdk_install_path}\\Licenses`,
      `${sdk_install_path}\\Templates`
      // old installers had
      //`${sdk_install_path}\\Bin32`,
      //`${sdk_install_path}\\Tools32`,
      //`${sdk_install_path}\\Lib32`,
    ]
    remove_folders_if_exist(folders_to_delete)

    // this deletes the files in the top-level folder
    // e.g. maintenancetool.exe, installer.dat, network.xml
    // which saves around ~25MB
    delete_files_in_folder(sdk_install_path)
  }
}
/**
 * Remove one folder, if existing.
 *
 * @param {string} folder - The folder to remove.
 * @return {*}  {boolean}
 */
function remove_folder_if_exists(folder: string): boolean {
  try {
    if (fs.existsSync(folder)) {
      fs.rmSync(folder, {recursive: true})
      core.info(`Folder ${folder} removed successfully.`)
      return true
    } else {
      core.info(`Folder ${folder} doesn't exist.`)
    }
  } catch (error) {
    console.error(`Error removing folder: ${error}`)
  }

  return false
}
/**
 * Remove multiple folders, if existing.
 *
 * @param {string[]} folders - The folders to remove.
 */
function remove_folders_if_exist(folders: string[]): void {
  folders.forEach(folder => {
    remove_folder_if_exists(folder)
  })
}

function delete_files_in_folder(folder: string): void {
  fs.readdirSync(folder).forEach(file => {
    const filePath = path.join(folder, file)
    if (fs.statSync(filePath).isDirectory()) {
      // If subdirectory, skip it
      return
    } else {
      // If file, delete it
      fs.unlinkSync(filePath)
      core.info(`Deleted file: ${filePath}`)
    }
  })
}
/**
 * Copy a folder.
 *
 * @param {string} from
 * @param {string} to
 */
function copy_folder(from: string, to: string) {
  if (!fs.existsSync(to)) {
    fs.mkdirSync(to, {recursive: true})
  }
  fs.readdirSync(from).forEach(element => {
    if (fs.lstatSync(path.join(from, element)).isFile()) {
      fs.copyFileSync(path.join(from, element), path.join(to, element))
    } else {
      copy_folder(path.join(from, element), path.join(to, element))
    }
  })
}
