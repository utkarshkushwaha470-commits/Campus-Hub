Set WshShell = CreateObject("WScript.Shell")
strPath = WshShell.CurrentDirectory
WshShell.Run "cmd /c """ & strPath & "\Start_Campus_Hub.bat""", 0, False
Set WshShell = Nothing
