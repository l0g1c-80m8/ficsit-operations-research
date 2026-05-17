import os
import io
import threading
import logging
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import List, Dict, Any

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload
from googleapiclient.errors import HttpError

logging.basicConfig(level=logging.INFO, format='%(asctime)s - [%(threadName)s] - %(levelname)s - %(message)s')

SCOPES = ['https://www.googleapis.com/auth/drive.readonly']

thread_local = threading.local()

def get_credentials(credentials_path: str = 'credentials.json', token_path: str = 'token.json') -> Credentials:
    """Handles OAuth2 authentication and token persistence."""
    creds = None
    if os.path.exists(token_path):
        creds = Credentials.from_authorized_user_file(token_path, SCOPES)
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file(credentials_path, SCOPES)
            creds = flow.run_local_server(port=0)
        with open(token_path, 'w') as token:
            token.write(creds.to_json())
    return creds

def get_drive_service(creds: Credentials):
    """Instantiates a thread-safe Google Drive service object."""
    if not hasattr(thread_local, "service"):
        thread_local.service = build('drive', 'v3', credentials=creds)
    return thread_local.service

def download_revision_worker(file_id: str, rev_id: str, output_path: str, creds: Credentials) -> str:
    """Worker function for I/O bound media extraction."""
    service = get_drive_service(creds)

    try:
        request = service.revisions().get_media(fileId=file_id, revisionId=rev_id)
        with io.FileIO(output_path, mode='wb') as fh:
            downloader = MediaIoBaseDownload(fh, request)
            done = False
            while not done:
                status, done = downloader.next_chunk()
        return f"Successfully downloaded revision {rev_id}"
    except HttpError as error:
        return f"HTTP Error on {rev_id}: {error}"
    except Exception as e:
        return f"Unexpected exception on {rev_id}: {e}"

def extract_all_revisions(file_id: str, output_dir: str, max_workers: int = 5) -> None:
    """Orchestrates the retrieval and concurrent downloading of all file revisions."""
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    creds = get_credentials()
    service = build('drive', 'v3', credentials=creds)

    try:
        logging.info("Querying revision history...")
        revisions_result = service.revisions().list(
            fileId=file_id,
            fields="revisions(id, modifiedTime, originalFilename)"
        ).execute()

        revisions: List[Dict[str, Any]] = revisions_result.get('revisions', [])

        if not revisions:
            logging.warning("No revisions found for the specified file ID.")
            return

        logging.info(f"Identified {len(revisions)} revisions. Dispatching to thread pool...")

        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            future_to_rev = {}
            for index, rev in enumerate(revisions):
                rev_id = rev.get('id')
                safe_mod_time = rev.get('modifiedTime', f'time_unknown_{index}').replace(':', '-').replace('.', '-')

                original_filename = rev.get('originalFilename', f'file_{file_id}')
                name, ext = os.path.splitext(original_filename)
                output_filename = f"{name}_rev{rev_id}_{safe_mod_time}{ext}"
                output_path = os.path.join(output_dir, output_filename)

                future = executor.submit(download_revision_worker, file_id, rev_id, output_path, creds)
                future_to_rev[future] = rev_id

            for future in as_completed(future_to_rev):
                rev_id = future_to_rev[future]
                try:
                    result = future.result()
                    logging.info(result)
                except Exception as exc:
                    logging.error(f"Revision {rev_id} generated an exception: {exc}")

        logging.info("Extraction matrix complete.")

    except HttpError as error:
        logging.error(f"Google Drive API configuration error: {error}")

if __name__ == '__main__':
    TARGET_FILE_ID = '12dbAFb_BPABXWhhOEg_MLOVQp0JDc9gs'

    script_dir = os.path.dirname(os.path.abspath(__file__))
    DESTINATION_DIR = os.path.join(script_dir, '..', 'sample')

    extract_all_revisions(TARGET_FILE_ID, DESTINATION_DIR, max_workers=5)
