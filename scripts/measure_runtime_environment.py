import sys
import os
import subprocess
import shutil
import platform
import json
import urllib.request

def check_command(cmd):
    try:
        res = subprocess.run(cmd, capture_output=True, text=True, timeout=10, shell=True)
        return res.returncode == 0, res.stdout.strip(), res.stderr.strip()
    except Exception as e:
        return False, "", str(e)

def get_disk_space(drive):
    try:
        total, used, free = shutil.disk_usage(drive)
        return {
            "total_gb": round(total / (1024**3), 2),
            "used_gb": round(used / (1024**3), 2),
            "free_gb": round(free / (1024**3), 2),
            "free_pct": round((free / total) * 100, 2)
        }
    except Exception as e:
        return {"error": str(e)}

def check_url(url):
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=5) as resp:
            return resp.status == 200, resp.status
    except Exception as e:
        return False, str(e)

def main():
    info = {
        "os": f"{platform.system()} {platform.release()} ({platform.version()})",
        "machine": platform.machine(),
        "cpu_count": os.cpu_count(),
        "python": sys.version.split()[0],
        "python_executable": sys.executable,
    }

    # Node
    node_ok, node_out, _ = check_command("node -v")
    info["node_version"] = node_out if node_ok else "Not installed"

    # Git
    git_ok, git_out, _ = check_command("git --version")
    info["git_version"] = git_out if git_ok else "Not installed"

    # Docker
    docker_ok, docker_out, docker_err = check_command("docker version")
    info["docker_available"] = docker_ok
    info["docker_details"] = docker_out if docker_ok else (docker_err or "Docker daemon not running / not accessible")

    # WSL
    wsl_ok, wsl_out, wsl_err = check_command("wsl --status")
    info["wsl_available"] = wsl_ok
    info["wsl_details"] = wsl_out if wsl_ok else (wsl_err or "WSL not accessible")

    # Antigravity CLI
    agy_path = os.path.expandvars(r"%LOCALAPPDATA%\agy\bin\agy.exe")
    if os.path.exists(agy_path):
        info["agy_path"] = agy_path
        agy_v_ok, agy_v_out, _ = check_command(f'"{agy_path}" --version')
        info["agy_version"] = agy_v_out if agy_v_ok else "Unknown"
    else:
        info["agy_path"] = "Not found in %LOCALAPPDATA%\\agy\\bin\\agy.exe"
        info["agy_version"] = "None"

    # Disk
    info["disk_c"] = get_disk_space("C:\\")
    info["disk_d"] = get_disk_space("D:\\")

    # Internet check
    info["net_simple_evals"] = check_url("https://openaipublic.blob.core.windows.net/simple-evals/browse_comp_test_set.csv")[0]
    info["net_huggingface"] = check_url("https://huggingface.co")[0]
    info["net_github"] = check_url("https://github.com")[0]

    print(json.dumps(info, indent=2))

if __name__ == "__main__":
    main()
