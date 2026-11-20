"""Exercise installer source selection without changing host APT configuration."""
import os
import subprocess
from pathlib import Path
from tempfile import TemporaryDirectory

installer = Path(__file__).with_name("install-ci-chromium.sh").read_text()
ubuntu = "https://archive.ubuntu.com/ubuntu"
azure = "http://azure.archive.ubuntu.com/ubuntu"
ec2 = "https://us-east-1.ec2.archive.ubuntu.com/ubuntu"

with TemporaryDirectory() as directory:
    root = Path(directory)
    apt = root / "apt-fixture"
    sources = apt / "sources.list.d"
    sources.mkdir(parents=True)
    mirrors = apt / "apt-mirrors.txt"
    fallbacks = f"{ubuntu}/\tpriority:2\nhttps://security.ubuntu.com/ubuntu/\tpriority:3\n"
    mirrors.write_text(f"{azure}/\tpriority:1\n{ec2}/ priority:1\n{fallbacks}")
    direct = sources / "ubuntu.sources"
    stanza = "Types: deb\nURIs: {uri}\nSuites: noble noble-updates\nSigned-By: /usr/share/keyrings/ubuntu-archive-keyring.gpg\n"
    direct.write_text(stanza.format(uri=azure))
    by_file = sources / "mirror-file.sources"
    mirrored = stanza.format(uri="mirror+file:/etc/apt/apt-mirrors.txt")
    by_file.write_text(mirrored)
    list_source = sources / "regional.list"
    list_source.write_text(f"deb {ec2}/ noble main\n# deb {azure} noble main\n")
    unrelated = sources / "unrelated.list"
    untouched = f"deb https://download.example.org/ubuntu noble main\ndeb {azure}-other noble main\n"
    unrelated.write_text(untouched)
    script = root / "installer.sh"
    script.write_text(installer.replace("/etc/apt/", "apt-fixture/"))

    bin_dir = root / "bin"
    bin_dir.mkdir()
    sudo = bin_dir / "sudo"
    sudo.write_text("""#!/usr/bin/env bash
set -euo pipefail
[[ "$1" == sed && "$2" == -Ei && "$4" == apt-fixture/* ]]
if [[ $(uname -s) == Darwin ]]; then
  sed -E -i '' "$3" "$4"
else
  sed -E -i "$3" "$4"
fi
""")
    sudo.chmod(0o755)
    playwright = root / "node_modules/.bin/playwright"
    playwright.parent.mkdir(parents=True)
    playwright.write_text('#!/usr/bin/env bash\n[[ "$*" == "install --with-deps chromium" ]]\n')
    playwright.chmod(0o755)
    env = dict(os.environ, PATH=f"{bin_dir}:{os.environ['PATH']}", GITHUB_ACTIONS="true", RUNNER_OS="Linux")
    command = ["bash", str(script)]
    rejected = subprocess.run(command, cwd=root, env=dict(env, RUNNER_OS="Darwin"), capture_output=True)
    assert rejected.returncode == 1
    assert direct.read_text() == stanza.format(uri=azure)
    subprocess.run(command, cwd=root, env=env, check=True)
    assert mirrors.read_text() == f"{azure}/\tpriority:4\n{ec2}/ priority:4\n{fallbacks}"
    assert by_file.read_text() == mirrored
    assert direct.read_text() == stanza.format(uri=ubuntu)
    assert list_source.read_text() == f"deb {ubuntu}/ noble main\n# deb {azure} noble main\n"
    assert unrelated.read_text() == untouched

    mirrors.write_text(f"{azure} priority:1\n")
    subprocess.run(command, cwd=root, env=env, check=True)
    assert mirrors.read_text() == f"{azure} priority:1\n"

print("PASS: Azure and EC2 sources, existing signatures, unrelated sources, and runner guard")
