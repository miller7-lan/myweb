import json
import subprocess
import sys
import unittest
from pathlib import Path


SCRIPT = Path(__file__).resolve().parents[1] / "galaxy_site.py"


class GalaxySiteCliTests(unittest.TestCase):
    def run_cli(self, *args):
        return subprocess.run(
            [sys.executable, str(SCRIPT), *args],
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            check=False,
        )

    def test_doctor_json(self):
        result = self.run_cli("--json", "doctor")
        self.assertEqual(result.returncode, 0, result.stderr)
        payload = json.loads(result.stdout)
        self.assertTrue(payload["ok"])
        self.assertEqual(payload["project_name"], "dazzle-galaxy-show")

    def test_deploy_without_confirm_is_dry_run(self):
        result = self.run_cli("--json", "deploy", "manual")
        self.assertEqual(result.returncode, 0, result.stderr)
        payload = json.loads(result.stdout)
        self.assertTrue(payload["ok"])
        self.assertTrue(payload["dry_run"])
        self.assertTrue(payload["requires_confirm"])

    def test_update_without_confirm_is_dry_run(self):
        result = self.run_cli("--json", "update")
        self.assertEqual(result.returncode, 0, result.stderr)
        payload = json.loads(result.stdout)
        self.assertTrue(payload["ok"])
        self.assertTrue(payload["dry_run"])
        self.assertGreaterEqual(len(payload["steps"]), 4)


if __name__ == "__main__":
    unittest.main()
