Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
folder = fso.GetParentFolderName(WScript.ScriptFullName)
WshShell.CurrentDirectory = folder
WshShell.Run "cmd /c node server.js", 0, False
WScript.Sleep 2000
WshShell.Run "http://localhost:3000/dashboard.html", 1, False
