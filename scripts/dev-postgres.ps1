<#
.SYNOPSIS
    A throwaway local PostgreSQL for development and verification. No Docker,
    no installer, no admin rights: portable binaries, a data directory, done.

.DESCRIPTION
    Phase 1 of the fulfilment plan verifies the datastore seam against a real
    Postgres. This script stands one up from portable EDB binaries:

        1. Download the "PostgreSQL Binaries" zip from enterprisedb.com
           (no signup) and extract it somewhere, e.g.
           ..\..\.tools\pgsql so that pgsql\bin\initdb.exe exists.
        2. pwsh scripts/dev-postgres.ps1 -Action init
        3. pwsh scripts/dev-postgres.ps1 -Action start
           -> prints LEADS_DATABASE_URL; paste into .env.local
        4. pwsh scripts/dev-postgres.ps1 -Action stop

    Defaults suit this project folder (binaries under ..\..\.tools). Override
    with -PgBin / -DataDir or the PG_BIN / PG_DATA environment variables.

.PARAMETER Action
    init   - initialise the data directory once (safe to re-run: no-op if it exists)
    start  - start postgres on -Port, create -DbName if missing, print the URL
    stop   - stop postgres cleanly
    status - report whether postgres is running
#>
param(
    [Parameter(Mandatory = $true)]
    [ValidateSet('init', 'start', 'stop', 'status')]
    [string]$Action,

    [string]$PgBin,
    [string]$DataDir,

    [int]$Port = 54329,
    [string]$DbName = 'linwick',
    [string]$DbUser = 'linwick',
    [string]$DbPassword = 'linwick'
)

$ErrorActionPreference = 'Stop'

$toolRoot = Join-Path $PSScriptRoot '..\..\.tools'
if (-not $PgBin) { $PgBin = if ($env:PG_BIN) { $env:PG_BIN } else { Join-Path $toolRoot 'pgsql\bin' } }
if (-not $DataDir) { $DataDir = if ($env:PG_DATA) { $env:PG_DATA } else { Join-Path $toolRoot 'pgdata' } }

$PgBin = (Resolve-Path $PgBin -ErrorAction Stop).Path
$initdb = Join-Path $PgBin 'initdb.exe'
$pgCtl = Join-Path $PgBin 'pg_ctl.exe'
$psql = Join-Path $PgBin 'psql.exe'
foreach ($exe in @($initdb, $pgCtl, $psql)) {
    if (-not (Test-Path $exe)) {
        throw "Missing $exe. Download the PostgreSQL binaries zip from enterprisedb.com and extract it, or pass -PgBin."
    }
}

$url = "postgres://${DbUser}:${DbPassword}@127.0.0.1:${Port}/${DbName}"

switch ($Action) {

    'init' {
        if (Test-Path (Join-Path $DataDir 'PG_VERSION')) {
            Write-Output "Already initialised at $DataDir"
            return
        }
        New-Item -ItemType Directory -Force -Path $DataDir | Out-Null
        # initdb reads the password from a file rather than a prompt.
        $pwFile = Join-Path $env:TEMP ("pgpw-" + [guid]::NewGuid().ToString('N'))
        Set-Content -Path $pwFile -Value $DbPassword -NoNewline
        try {
            & $initdb -D $DataDir -U $DbUser -A password --pwfile=$pwFile -E UTF8 --locale=C
            if ($LASTEXITCODE -ne 0) { throw "initdb failed ($LASTEXITCODE)" }
        } finally {
            Remove-Item $pwFile -Force -ErrorAction SilentlyContinue
        }
        Write-Output "Initialised $DataDir"
    }

    'start' {
        # Idempotent: a second 'start' against a live server is a no-op.
        & $pgCtl -D $DataDir status *> $null
        if ($LASTEXITCODE -eq 0) {
            Write-Output "Already running on data dir $DataDir."
            Write-Output "LEADS_DATABASE_URL=$url"
            return
        }

        $log = Join-Path $DataDir 'postgres.log'
        # Start-Process rather than calling pg_ctl directly: a direct call lets
        # postgres.exe inherit this console's stdio handles, and PowerShell
        # then hangs on exit waiting for a server that runs for days. A
        # detached process with its own handles leaves cleanly.
        Start-Process -FilePath $pgCtl `
            -ArgumentList @('-D', $DataDir, '-l', $log, '-o', "`"-p $Port`"", 'start') `
            -WindowStyle Hidden -Wait
        if ($LASTEXITCODE -ne 0 -and $null -ne $LASTEXITCODE) {
            throw "pg_ctl start failed ($LASTEXITCODE); see $log"
        }

        # Wait until it answers, then make sure the database exists.
        $env:PGPASSWORD = $DbPassword
        $ready = $false
        foreach ($i in 1..30) {
            & $psql -h 127.0.0.1 -p $Port -U $DbUser -d postgres -tAc 'select 1;' *> $null
            if ($LASTEXITCODE -eq 0) { $ready = $true; break }
            Start-Sleep -Milliseconds 500
        }
        if (-not $ready) { throw "postgres did not answer on port $Port; see $log" }

        & $psql -h 127.0.0.1 -p $Port -U $DbUser -d postgres -tAc `
            "select count(*) from pg_database where datname='$DbName';" | Out-Null
        if ($LASTEXITCODE -ne 0) { throw 'could not query pg_database' }
        $exists = (& $psql -h 127.0.0.1 -p $Port -U $DbUser -d postgres -tAc `
            "select count(*) from pg_database where datname='$DbName';")
        if ($exists -eq '0') {
            & $psql -h 127.0.0.1 -p $Port -U $DbUser -d postgres -c "create database $DbName;"
            if ($LASTEXITCODE -ne 0) { throw "could not create database $DbName" }
        }
        Write-Output "Running on port $Port."
        Write-Output "LEADS_DATABASE_URL=$url"
    }

    'stop' {
        & $pgCtl -D $DataDir -m fast stop
        Write-Output 'Stopped.'
    }

    'status' {
        & $pgCtl -D $DataDir status
    }
}
