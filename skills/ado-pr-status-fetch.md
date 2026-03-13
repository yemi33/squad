---
created: 2026-03-13
author: Dallas
name: ado-pr-status-fetch
description: Fetch ADO PR status when az CLI is broken, using git credential manager + curl
allowed-tools: Bash
trigger: when az CLI fails with DLL/import errors and you need to query ADO REST API
scope: squad
project: any
---

# Fetch ADO PR Status via Git Credential Manager

Use this when `az repos pr show` fails due to broken az CLI (win32file DLL error).

## Steps

1. Get bearer token from git credential manager: