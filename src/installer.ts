import * as core from '@actions/core'
import * as fs from 'fs'
import * as platform from './platform'
import * as tc from '@actions/tool-cache'
import * as path from 'path'
import {execSync} from 'child_process'

export async function install_vulkan_sdk(
  sdk_path: string,
  destination: string,
  version: string,
  optional_components: string[]
): Promise<string> {
  let install_path = ''

  core.info(`📦 Extracting Vulkan SDK...`)

  if (platform.IS_MAC) {
    // TODO
  }

  if (platform.IS_LINUX) {
    install_path = await extract_archive(sdk_path, destination)
  }

  if (platform.IS_WINDOWS) {
    // arguments for Vulkan-Installer.exe
    let cmd_args = [
      '--root',
      destination,
      '--accept-licenses',
      '--default-answer',
      '--confirm-command',
      'install',
      optional_components
    ]
    let install_cmd = cmd_args.join(' ')

    // Installation of optional components:
    //
    // --confirm-command install com.lunarg.vulkan.32bit
    //                           com.lunarg.vulkan.thirdparty
    //                           com.lunarg.vulkan.debug
    //                           com.lunarg.vulkan.debug32

    // The installer must be run as administrator.
    // powershell.exe Start-Process
    //   -FilePath 'VulkanSDK-1.3.216.0-Installer.exe'
    //   -Args '--root C:\VulkanSDK --accept-licenses --default-answer --confirm-command install'
    //   -Verb runas
    const run_as_admin_cmd = `powershell.exe Start-Process -FilePath '${sdk_path}' -Args '${install_cmd}' -Verb RunAs`

    try {
      /*let stdout: string = execSync(run_as_admin_cmd).toString().trim()
      process.stdout.write(stdout)*/
      execSync(run_as_admin_cmd)
      install_path = destination
    } catch (error: any) {
      core.setFailed(`Installer failed: ${install_cmd}`)
    }
  }

  core.info(`   Installed into folder: ${install_path}`)

  core.addPath(install_path)

  return install_path
}

export async function install_vulkan_runtime(runtime_path: string, destination: string): Promise<string> {
  core.info(`📦 Extracting Vulkan Runtime (➔ vulkan-1.dll) ...`)
  const runtime_destination = path.normalize(`${destination}/runtime`)
  const install_path = extract_archive(runtime_path, runtime_destination)
  return install_path
}

async function extract_archive(file: string, destination: string): Promise<string> {
  const extract = tc.extractTar
  if (platform.IS_WINDOWS) {
    if (file.endsWith('.exe')) {
      return destination
    } else if (file.endsWith('.zip')) {
      const extract = tc.extractZip
    } else if (file.endsWith('.7z')) {
      const extract = tc.extract7z
    }
  } else if (platform.IS_MAC) {
    const extract = tc.extractXar
  } else {
    const extract = tc.extractTar
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
