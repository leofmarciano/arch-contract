# Security Policy

## Supported versions

ArchContract is pre-1.0. Security fixes are applied to the latest published
`0.x` release.

| Version | Supported |
| --- | --- |
| 0.1.x | ✅ |

## Reporting a vulnerability

Please **do not** open a public issue for security vulnerabilities.

Instead, report privately via one of:

- GitHub's [private vulnerability reporting](https://github.com/leofmarciano/arch-contract/security/advisories/new)

Include a description, reproduction steps, affected versions, and (if possible) a
suggested fix. We aim to acknowledge reports within 72 hours and to provide a
remediation timeline after triage.

## Scope

ArchContract reads your TypeScript source and YAML config and emits reports. It does
not execute project code. Reports of arbitrary code execution, path traversal,
or denial of service triggered by crafted config/source are in scope.
