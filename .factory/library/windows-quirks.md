# Windows Environment Quirks

## PowerShell Execution
By default, the `Execute` tool uses Windows PowerShell.
- **Command Chaining**: The `&&` operator does not work consistently in PowerShell. Use `;` to separate commands, or explicitly wrap them in `cmd /c "command1 && command2"`.
- **cURL**: `curl` is aliased to `Invoke-WebRequest` in PowerShell. For standard cURL behavior (like healthchecks), use `curl.exe` instead.

## agent-browser Ports
When using `agent-browser`, it might fail to start with `EACCES permission denied` on dynamic ports (e.g., 59639). This is typically due to Windows Hyper-V or TCP dynamic port exclusion ranges blocking port binding. If this happens, retry with a different port or check the system's excluded port ranges.
