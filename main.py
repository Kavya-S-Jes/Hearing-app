from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
import pymssql

DB_SERVER   = "SPXDB"
DB_DATABASE = "spartaxx"

app = FastAPI(title="Hearing Accounts API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_conn():
    return pymssql.connect(server=DB_SERVER, database=DB_DATABASE)


@app.get("/")
def root():
    return {"message": "Hearing Accounts API is running"}


@app.get("/hearings")
def get_hearings(
    county: Optional[str]  = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str]   = Query(None),
):
    conn = get_conn()
    cursor = conn.cursor(as_dict=True)

    query = "SELECT TOP 200 * FROM PTAX_HearingDetails WHERE FormalHearingDate IS NOT NULL"

    if start_date:
        query += f" AND FormalHearingDate >= '{start_date}'"
    if end_date:
        query += f" AND FormalHearingDate <= '{end_date}'"

    query += " ORDER BY FormalHearingDate DESC"

    cursor.execute(query)
    rows = cursor.fetchall()
    conn.close()
    return rows


@app.get("/counties")
def get_counties():
    conn = get_conn()
    cursor = conn.cursor(as_dict=True)
    cursor.execute("SELECT DISTINCT CountyName FROM County_Taxroll_SPX WHERE CountyName IS NOT NULL ORDER BY CountyName")
    rows = cursor.fetchall()
    conn.close()
    return [r["CountyName"] for r in rows]
