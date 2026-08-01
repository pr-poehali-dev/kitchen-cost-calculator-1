import json
import os
import logging
import jwt
import psycopg2
import boto3
from contextlib import contextmanager

logger = logging.getLogger(__name__)

ALLOWED_ORIGINS = [o.strip() for o in os.environ.get('ALLOWED_ORIGINS', '').split(',') if o.strip()]

def get_cors(event: dict) -> dict:
    origin = (event.get('headers') or {}).get('origin') or (event.get('headers') or {}).get('Origin') or ''
    allowed = origin if (origin and (any(origin == o for o in ALLOWED_ORIGINS) or not ALLOWED_ORIGINS)) else (ALLOWED_ORIGINS[0] if ALLOWED_ORIGINS else '*')
    return {
        'Access-Control-Allow-Origin': allowed,
        'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Authorization',
        'Access-Control-Allow-Credentials': 'true',
    }
JWT_SECRET = os.environ['JWT_SECRET']
S3_KEY = os.environ.get('AWS_ACCESS_KEY_ID', '')
S3_SECRET = os.environ.get('AWS_SECRET_ACCESS_KEY', '')


@contextmanager
def get_db():
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def verify_token(event: dict):
    headers = event.get('headers') or {}
    auth = headers.get('X-Authorization') or headers.get('Authorization') or ''
    token = auth[7:].strip() if auth.startswith('Bearer ') else ''
    if not token:
        return None
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
    except Exception:
        return None


def _make_ok(cors):
    def ok(data, status=200):
        return {'statusCode': status, 'headers': {**cors, 'Content-Type': 'application/json'}, 'body': json.dumps(data, default=str)}
    return ok

def _make_err(cors):
    def err(msg, status=400):
        return {'statusCode': status, 'headers': {**cors, 'Content-Type': 'application/json'}, 'body': json.dumps({'error': msg})}
    return err


def s3_client():
    return boto3.client(
        's3',
        endpoint_url='https://bucket.poehali.dev',
        aws_access_key_id=S3_KEY,
        aws_secret_access_key=S3_SECRET,
    )


def row_to_client(row, cur):
    cols = [d[0] for d in cur.description]
    return dict(zip(cols, row))

