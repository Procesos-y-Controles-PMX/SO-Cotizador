import os
from typing import Optional

from supabase import Client, create_client


def get_supabase_client() -> Optional[Client]:
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

    if not supabase_url or not supabase_service_key:
        return None

    return create_client(supabase_url, supabase_service_key)
