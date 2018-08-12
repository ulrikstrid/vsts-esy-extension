# VSTS Esy Task

Task for running [Esy](https://esy.sh) commands in a VSTS pipeline.

## What it does

- Try to find Esy
  - b. globally
  - a. locally
- If we can't find it, install it globally
- Run wanted command
