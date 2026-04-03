import os

from supabase import Client, create_client


def _client() -> Client:
    return create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_KEY"])


# ---------------------------------------------------------------------------
# Usuários
# ---------------------------------------------------------------------------

def get_or_create_user(email: str, auth_user_id: str | None = None) -> dict:
    db = _client()
    result = db.table("users").select("*").eq("email", email).execute()
    if result.data:
        return result.data[0]
    data: dict = {"email": email, "total_tokens_used": 0}
    if auth_user_id:
        data["id"] = auth_user_id
    insert = db.table("users").insert(data).execute()
    return insert.data[0]


def update_user_area(user_id: str, area: str) -> dict:
    db = _client()
    result = db.table("users").update(
        {"area": area}).eq("id", user_id).execute()
    return result.data[0]


def add_tokens(user_id: str, tokens: int) -> dict:
    db = _client()
    user = db.table("users").select("total_tokens_used").eq(
        "id", user_id).execute().data[0]
    new_total = user["total_tokens_used"] + tokens
    result = db.table("users").update(
        {"total_tokens_used": new_total}).eq("id", user_id).execute()
    return result.data[0]


# ---------------------------------------------------------------------------
# Análises
# ---------------------------------------------------------------------------

def save_analysis(user_id: str, job_area: str, tokens_used: int, result_json: dict) -> dict:
    db = _client()
    result = db.table("analyses").insert({
        "user_id": user_id,
        "job_area": job_area,
        "tokens_used": tokens_used,
        "result_json": result_json,
        "paid": False,
    }).execute()
    return result.data[0]


def get_analysis(analysis_id: str) -> dict | None:
    db = _client()
    result = db.table("analyses").select("*").eq("id", analysis_id).execute()
    if not result.data:
        return None
    return result.data[0]


def mark_analysis_paid(analysis_id: str) -> dict:
    db = _client()
    result = db.table("analyses").update(
        {"paid": True}).eq("id", analysis_id).execute()
    return result.data[0]


# ---------------------------------------------------------------------------
# Feedback
# ---------------------------------------------------------------------------

def save_feedback(user_id: str, analysis_id: str, rating: int, comment: str) -> dict:
    db = _client()
    result = db.table("feedbacks").insert({
        "user_id": user_id,
        "analysis_id": analysis_id,
        "rating": rating,
        "comment": comment,
    }).execute()
    return result.data[0]


def get_feedback(analysis_id: str, user_id: str) -> dict | None:
    db = _client()
    result = (
        db.table("feedbacks")
        .select("*")
        .eq("analysis_id", analysis_id)
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    if not result.data:
        return None
    return result.data[0]
