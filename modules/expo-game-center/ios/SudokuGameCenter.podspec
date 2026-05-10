require 'json'

# Pinned to the local module's package.json so a future bump propagates.
package = JSON.parse(File.read(File.join(__dir__, '..', 'package.json')))

Pod::Spec.new do |s|
  s.name           = 'SudokuGameCenter'
  s.version        = package['version']
  s.summary        = package['description']
  s.description    = package['description']
  s.license        = { type: 'UNLICENSED' }
  s.author         = 'Sudoku Evolved'
  s.homepage       = 'https://sudokuevolved.com'
  s.platforms      = { :ios => '16.0' }
  s.swift_version  = '5.9'
  s.source         = { git: '' }
  s.static_framework = true

  # Expo Modules Core powers the Module/AsyncFunction DSL used in
  # SudokuGameCenterModule.swift. GameKit is a system framework — no
  # pod dep needed; it's linked via the framework declaration below.
  s.dependency 'ExpoModulesCore'
  s.frameworks   = 'GameKit'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE'         => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }

  s.source_files = '**/*.{h,m,swift}'
end
