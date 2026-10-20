<#
.SYNOPSIS
  Manage the optional portable PostgreSQL used for local development (no admin rights needed).

.EXAMPLE
  .\scripts\dev-db.ps1 install   # download binaries, init cluster, create role + databases
  .\scripts\dev-db.ps1 start
  .\scripts\dev-db.ps1 stop
  .\scripts\dev-db.ps1 status

  If you already have PostgreSQL installed, skip this script and set DATABASE_URL in backend/.env.
#>
param([Parameter(Mandatory)][ValidateSet("install", "start", "stop", "status")][string]$Action)

$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$tools = Join-Path $root ".devtools"
$bin = Join-Path $tools "pgsql\bin"
$data = Join-Path $tools "pgdata"
$log = Join-Path $tools "pg.log"
$version = "17.6-1"

switch ($Action) {
  "install" {
    New-Item -ItemType Directory -Force $tools | Out-Null
    if (-not (Test-Path $bin)) {
      $zip = Join-Path $tools "pg.zip"
      Write-Host "Downloading PostgreSQL $version binaries (about 330 MB)..."
      $ProgressPreference = "SilentlyContinue"
      Invoke-WebRequest "https://get.enterprisedb.com/postgresql/postgresql-$version-windows-x64-binaries.zip" -OutFile $zip -UseBasicParsing
      Expand-Archive $zip -DestinationPath $tools -Force
      Remove-Item $zip
    }
    if (-not (Test-Path $data)) {
      $superPw = Read-Host "Choose a password for the local 'postgres' superuser"
      $appPw = Read-Host "Choose a password for the 'resume_app' database user"
      $pwFile = Join-Path $tools "pw.tmp"
      [IO.File]::WriteAllText($pwFile, $superPw)
      & "$bin\initdb.exe" -D $data -U postgres --pwfile=$pwFile --auth=scram-sha-256 -E UTF8 --locale=C | Out-Null
      Remove-Item $pwFile
      & "$bin\pg_ctl.exe" -D $data -l $log -o "-c listen_addresses=localhost -p 5432" start | Out-Null
      $env:PGPASSWORD = $superPw
      & "$bin\psql.exe" -h localhost -U postgres -c "CREATE ROLE resume_app LOGIN PASSWORD '$appPw';" `
        -c "CREATE DATABASE resume_analyzer OWNER resume_app;" `
        -c "CREATE DATABASE resume_analyzer_test OWNER resume_app;" `
        -c "CREATE DATABASE resume_analyzer_e2e OWNER resume_app;"
      Write-Host "Done. Use DATABASE_URL=postgresql+psycopg://resume_app:<password>@localhost:5432/resume_analyzer"
    }
  }
  "start" { & "$bin\pg_ctl.exe" -D $data -l $log -o "-c listen_addresses=localhost -p 5432" start }
  "stop" { & "$bin\pg_ctl.exe" -D $data stop }
  "status" { & "$bin\pg_ctl.exe" -D $data status }
}
