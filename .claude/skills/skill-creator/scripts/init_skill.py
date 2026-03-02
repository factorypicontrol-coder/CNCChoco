#!/usr/bin/env python3
"""
init_skill.py — Scaffold a new Claude skill directory.

Usage:
    python3 init_skill.py <skill-name> --path <output-directory>

Example:
    python3 init_skill.py my-skill --path ~/.claude/skills/
"""

import argparse
import os
import sys


SKILL_MD_TEMPLATE = """\
---
name: {name}
description: >
  TODO: Describe what this skill does and when it should be used.
  Use third-person phrasing: "This skill should be used when..."
---

# {title}

## Purpose

TODO: Explain the purpose of this skill in 2-3 sentences.

---

## When to Use

TODO: Describe the conditions under which this skill should be triggered.

---

## Workflow

TODO: Describe the step-by-step workflow Claude should follow.

### Step 1 — TODO

### Step 2 — TODO

---

## References

TODO: List any reference files in references/ that Claude should consult,
and when to load them.

---

## Constraints

TODO: List any rules, restrictions, or things Claude must never do.
"""

SCRIPTS_EXAMPLE = """\
#!/usr/bin/env python3
# TODO: Replace this example script or delete the scripts/ directory
# if this skill does not need executable scripts.
print("example script")
"""

REFERENCES_EXAMPLE = """\
# TODO: Replace this with reference documentation, schemas, or domain knowledge
# that Claude should load when working through this skill's workflow.
# Delete this file and the references/ directory if not needed.
"""

ASSETS_README = """\
# assets/

TODO: Place files here that will be used in Claude's output — templates,
images, boilerplate code, etc. Delete this directory if not needed.
"""


def slugify(name: str) -> str:
    return name.lower().replace(" ", "-").replace("_", "-")


def title_case(name: str) -> str:
    return " ".join(word.capitalize() for word in name.replace("-", " ").replace("_", " ").split())


def create_skill(name: str, output_path: str) -> None:
    slug = slugify(name)
    skill_dir = os.path.join(output_path, slug)

    if os.path.exists(skill_dir):
        print(f"Error: directory already exists: {skill_dir}", file=sys.stderr)
        sys.exit(1)

    # Create directory structure
    dirs = [
        skill_dir,
        os.path.join(skill_dir, "scripts"),
        os.path.join(skill_dir, "references"),
        os.path.join(skill_dir, "assets"),
    ]
    for d in dirs:
        os.makedirs(d, exist_ok=True)

    # Write SKILL.md
    skill_md_path = os.path.join(skill_dir, "SKILL.md")
    with open(skill_md_path, "w") as f:
        f.write(SKILL_MD_TEMPLATE.format(name=slug, title=title_case(slug)))

    # Write example files
    scripts_example_path = os.path.join(skill_dir, "scripts", "example.py")
    with open(scripts_example_path, "w") as f:
        f.write(SCRIPTS_EXAMPLE)
    os.chmod(scripts_example_path, 0o755)

    with open(os.path.join(skill_dir, "references", "example.md"), "w") as f:
        f.write(REFERENCES_EXAMPLE)

    with open(os.path.join(skill_dir, "assets", "README.md"), "w") as f:
        f.write(ASSETS_README)

    print(f"Skill scaffolded at: {skill_dir}")
    print()
    print("Next steps:")
    print(f"  1. Edit {skill_md_path}")
    print(f"  2. Add scripts to {os.path.join(skill_dir, 'scripts/')} or delete the directory")
    print(f"  3. Add references to {os.path.join(skill_dir, 'references/')} or delete the directory")
    print(f"  4. Add assets to {os.path.join(skill_dir, 'assets/')} or delete the directory")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Scaffold a new Claude skill directory."
    )
    parser.add_argument("name", help="Name of the skill (e.g. 'my-skill')")
    parser.add_argument(
        "--path",
        required=True,
        help="Output directory where the skill folder will be created",
    )
    args = parser.parse_args()

    output_path = os.path.expanduser(args.path)
    if not os.path.isdir(output_path):
        print(f"Error: output path does not exist: {output_path}", file=sys.stderr)
        sys.exit(1)

    create_skill(args.name, output_path)


if __name__ == "__main__":
    main()
