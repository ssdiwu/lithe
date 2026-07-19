; "Open in Lithe" shell verbs for folders, folder backgrounds, and drives.
; HKCU matches installer currentUser scope. %V = clicked path.
; NoWorkingDirectory keeps Explorer from overriding %V (System32 on Drive).

!macro NSIS_HOOK_POSTINSTALL
  WriteRegStr HKCU "Software\Classes\Directory\shell\OpenInLithe" "" "Open in Lithe"
  WriteRegStr HKCU "Software\Classes\Directory\shell\OpenInLithe" "Icon" '"$INSTDIR\lithe.exe",0'
  WriteRegStr HKCU "Software\Classes\Directory\shell\OpenInLithe" "NoWorkingDirectory" ""
  WriteRegStr HKCU "Software\Classes\Directory\shell\OpenInLithe\command" "" '"$INSTDIR\lithe.exe" "%V"'

  WriteRegStr HKCU "Software\Classes\Directory\Background\shell\OpenInLithe" "" "Open in Lithe"
  WriteRegStr HKCU "Software\Classes\Directory\Background\shell\OpenInLithe" "Icon" '"$INSTDIR\lithe.exe",0'
  WriteRegStr HKCU "Software\Classes\Directory\Background\shell\OpenInLithe" "NoWorkingDirectory" ""
  WriteRegStr HKCU "Software\Classes\Directory\Background\shell\OpenInLithe\command" "" '"$INSTDIR\lithe.exe" "%V"'

  WriteRegStr HKCU "Software\Classes\Drive\shell\OpenInLithe" "" "Open in Lithe"
  WriteRegStr HKCU "Software\Classes\Drive\shell\OpenInLithe" "Icon" '"$INSTDIR\lithe.exe",0'
  WriteRegStr HKCU "Software\Classes\Drive\shell\OpenInLithe" "NoWorkingDirectory" ""
  WriteRegStr HKCU "Software\Classes\Drive\shell\OpenInLithe\command" "" '"$INSTDIR\lithe.exe" "%V"'
!macroend

!macro NSIS_HOOK_POSTUNINSTALL
  DeleteRegKey HKCU "Software\Classes\Directory\shell\OpenInLithe"
  DeleteRegKey HKCU "Software\Classes\Directory\Background\shell\OpenInLithe"
  DeleteRegKey HKCU "Software\Classes\Drive\shell\OpenInLithe"
!macroend
