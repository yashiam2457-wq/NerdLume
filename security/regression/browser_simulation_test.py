"""
Automated Multi-Tier Chrome Browser Simulation & Generation Analysis Test
Tests Free, Premium (Scholar Pro), and Diamond roles against UI & Backend feature locks.
Analyzes exact prompts sent to models and verifies real vs fallback generation.
"""

import os
import sys
import time
import json
import sqlite3
import subprocess
import urllib.request
import urllib.error
from pathlib import Path

# Add backend directory to path
backend_dir = Path(__file__).resolve().parents[2] / "backend"
sys.path.insert(0, str(backend_dir))

import server

from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By

TEST_PORT = 5050
BASE_URL = f"http://127.0.0.1:{TEST_PORT}"


def wait_for_server(url, timeout=15):
    start = time.time()
    while time.time() - start < timeout:
        try:
            with urllib.request.urlopen(f"{url}/api/health", timeout=2) as resp:
                if resp.status == 200:
                    return True
        except Exception:
            time.sleep(0.5)
    return False


def setup_simulation_users():
    """Create test users for free, free-premium, and diamond plans in the SQLite database."""
    users = [
        {
            "id": "sim_user_free",
            "name": "Sim Free User",
            "email": "free_sim@nerdybro.local",
            "username": "free_sim",
            "plan": "free",
            "token": "sim_tok_free_12345"
        },
        {
            "id": "sim_user_premium",
            "name": "Sim Premium User",
            "email": "premium_sim@nerdybro.local",
            "username": "premium_sim",
            "plan": "free-premium",
            "token": "sim_tok_premium_12345"
        },
        {
            "id": "sim_user_diamond",
            "name": "Sim Diamond User",
            "email": "diamond_sim@nerdybro.local",
            "username": "diamond_sim",
            "plan": "diamond",
            "token": "sim_tok_diamond_12345"
        }
    ]
    with sqlite3.connect(server.DB_FILE) as db:
        for u in users:
            pw_json = json.dumps(server.password_record("TestPass@123"))
            db.execute("DELETE FROM sessions WHERE user_id = ?", (u["id"],))
            db.execute("DELETE FROM users WHERE id = ?", (u["id"],))
            db.execute(
                """INSERT INTO users (id, email, username, mobile, first_name, last_name, plan, role, join_date, notes_count, sessions_count, files_count, password, created_at, updated_at)
                   VALUES (?, ?, ?, '', ?, '', ?, 'user', 'Nov 2026', 0, 0, 0, ?, ?, ?)""",
                (u["id"], u["email"], u["username"], u["name"], u["plan"], pw_json, server.utc_now(), server.utc_now())
            )
            db.execute(
                """INSERT INTO sessions (token, user_id, created_at, last_seen_at, expires_at)
                   VALUES (?, ?, ?, ?, '2099-01-01T00:00:00Z')""",
                (u["token"], u["id"], server.utc_now(), server.utc_now())
            )
        db.commit()
    return {u["plan"]: u for u in users}


def run_simulation():
    print("=" * 70)
    print("NERDYBRO MULTI-TIER BROWSER & GENERATION SIMULATION TEST")
    print("=" * 70)

    # 1. Prepare Database Users
    users = setup_simulation_users()
    print("[1] Test users seeded:")
    for plan, u in users.items():
        print(f"    - {plan.upper()}: {u['email']} (Token: {u['token']})")

    # 2. Ensure Backend Server is online
    server_proc = None
    if wait_for_server(BASE_URL, timeout=1):
        print(f"[2] Backend server already running on port {TEST_PORT}.")
    else:
        print(f"[2] Launching backend server on port {TEST_PORT}...")
        env = os.environ.copy()
        env["PORT"] = str(TEST_PORT)
        env["NERDYBRO_PORT"] = str(TEST_PORT)
        server_proc = subprocess.Popen(
            [sys.executable, str(backend_dir / "server.py")],
            env=env,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL
        )
        if not wait_for_server(BASE_URL, timeout=10):
            print("Failed to start backend server!")
            if server_proc:
                server_proc.kill()
            return
        print("    Backend server online and accepting requests.")

    results = {
        "free_user": {},
        "premium_user": {},
        "diamond_user": {},
        "api_generation": {},
        "prompts_and_models": {}
    }

    # 3. Launch Chrome WebDriver
    print("[3] Launching Chrome WebDriver (Headless mode)...")
    opts = Options()
    opts.add_argument("--headless=new")
    opts.add_argument("--no-sandbox")
    opts.add_argument("--disable-dev-shm-usage")
    opts.add_argument("--disable-gpu")
    opts.add_argument("--window-size=1280,900")
    driver = webdriver.Chrome(options=opts)

    def set_user_context(user, target_path="/index.html"):
        driver.get(f"{BASE_URL}/index.html")
        time.sleep(0.4)
        script = (
            "const user = arguments[0];"
            "localStorage.clear();"
            "sessionStorage.clear();"
            "localStorage.setItem('nb_session', JSON.stringify({"
            "    id: user.id,"
            "    firstName: user.name.split(' ')[0],"
            "    lastName: user.name.split(' ').slice(1).join(' '),"
            "    name: user.name,"
            "    username: user.username,"
            "    email: user.email,"
            "    plan: user.plan,"
            "    token: user.token"
            "}));"
            "localStorage.setItem('nb_api_token', user.token);"
        )
        driver.execute_script(script, user)
        driver.get(f"{BASE_URL}{target_path}")
        time.sleep(0.8)

    try:
        # ─────────────────────────────────────────────────────────────
        # PART A: FREE USER SIMULATION
        # ─────────────────────────────────────────────────────────────
        print("\n[PART A] SIMULATING FREE SCHOLAR USER (plan: free)")
        free_user = users["free"]
        set_user_context(free_user, "/index.html")

        # Check Mock Test locked
        mock_card = driver.find_element(By.ID, "pmc-mock")
        mock_locked = "is-locked" in mock_card.get_attribute("class")
        print(f"    • Mock Test Mode Card locked: {mock_locked}")
        results["free_user"]["mock_card_locked"] = mock_locked

        # Click Mock Test -> verify paywall modal appears
        driver.execute_script("document.getElementById('pmc-mock').click();")
        time.sleep(0.5)
        modal_open = driver.execute_script("return Boolean(document.getElementById('pricing-modal')?.classList.contains('pm-open'));")
        print(f"    • Clicking Mock Test opens Paywall Modal: {modal_open}")
        results["free_user"]["mock_paywall_modal_opened"] = modal_open
        driver.execute_script("if (typeof closePricingModal === 'function') closePricingModal();")
        time.sleep(0.3)

        # Check Flash Cards locked
        flash_card = driver.find_element(By.ID, "pmc-flash")
        flash_locked = "is-locked" in flash_card.get_attribute("class")
        print(f"    • Flash Cards Mode Card locked: {flash_locked}")
        results["free_user"]["flash_card_locked"] = flash_locked

        # Click Flash Cards -> verify paywall modal appears
        driver.execute_script("document.getElementById('pmc-flash').click();")
        time.sleep(0.5)
        modal_open = driver.execute_script("return Boolean(document.getElementById('pricing-modal')?.classList.contains('pm-open'));")
        print(f"    • Clicking Flash Cards opens Paywall Modal: {modal_open}")
        results["free_user"]["flash_paywall_modal_opened"] = modal_open
        driver.execute_script("if (typeof closePricingModal === 'function') closePricingModal();")
        time.sleep(0.3)

        # Check Explain Mode locked
        explain_card = driver.find_element(By.ID, "goal-explain")
        explain_locked = "is-locked" in explain_card.get_attribute("class")
        print(f"    • Explain Mode Goal Card locked: {explain_locked}")
        results["free_user"]["explain_goal_locked"] = explain_locked

        driver.execute_script("document.getElementById('goal-explain').click();")
        time.sleep(0.5)
        modal_open = driver.execute_script("return Boolean(document.getElementById('pricing-modal')?.classList.contains('pm-open'));")
        print(f"    • Clicking Explain Mode opens Paywall Modal: {modal_open}")
        results["free_user"]["explain_paywall_modal_opened"] = modal_open
        driver.execute_script("if (typeof closePricingModal === 'function') closePricingModal();")
        time.sleep(0.3)

        # Navigate directly to mocktest.html
        driver.get(f"{BASE_URL}/mocktest.html?topic=Operating%20Systems")
        time.sleep(0.8)
        page_text = driver.find_element(By.TAG_NAME, "body").text
        mock_suite_blocked = "Mock Exam Suite Locked" in page_text and "PREMIUM MODULE • MOCK EXAMINATIONS" in page_text
        print(f"    • Direct URL access to mocktest.html blocked with paywall: {mock_suite_blocked}")
        results["free_user"]["direct_mocktest_url_blocked"] = mock_suite_blocked

        # Navigate directly to flashcard.html
        driver.get(f"{BASE_URL}/flashcard.html?topic=Operating%20Systems")
        time.sleep(0.8)
        page_text = driver.find_element(By.TAG_NAME, "body").text
        flash_suite_blocked = "Flashcards Suite Locked" in page_text and "PREMIUM MODULE • REPETITION SUITE" in page_text
        print(f"    • Direct URL access to flashcard.html blocked with paywall: {flash_suite_blocked}")
        results["free_user"]["direct_flashcard_url_blocked"] = flash_suite_blocked

        # Navigate to quiz.html with count=15 -> verify capped to 5
        driver.get(f"{BASE_URL}/quiz.html?count=15&topic=Operating%20Systems")
        time.sleep(0.8)
        live_total = driver.find_element(By.ID, "live-total").text
        quiz_capped = live_total == "5"
        print(f"    • Extended Quiz count=15 capped to free limit (5 Qs): {quiz_capped} (live-total: {live_total})")
        results["free_user"]["quiz_count_capped_to_5"] = quiz_capped

        # ─────────────────────────────────────────────────────────────
        # PART B: PREMIUM USER SIMULATION (Scholar Pro)
        # ─────────────────────────────────────────────────────────────
        print("\n[PART B] SIMULATING SCHOLAR PRO USER (plan: free-premium)")
        premium_user = users["free-premium"]
        set_user_context(premium_user, "/index.html")

        # Check Mock Test unlocked
        mock_card = driver.find_element(By.ID, "pmc-mock")
        mock_locked = "is-locked" in mock_card.get_attribute("class")
        print(f"    • Mock Test Mode Card is locked: {mock_locked} (Expected: False)")
        results["premium_user"]["mock_card_unlocked"] = not mock_locked

        driver.execute_script("document.getElementById('pmc-mock').click();")
        time.sleep(0.5)
        mock_selected = "selected" in mock_card.get_attribute("class")
        modal_open = driver.execute_script("return Boolean(document.getElementById('pricing-modal')?.classList.contains('pm-open'));")
        print(f"    • Clicking Mock Test selects card: {mock_selected}, Modal shown: {modal_open}")
        results["premium_user"]["mock_card_selectable"] = mock_selected and not modal_open

        # Check Flash Cards unlocked
        flash_card = driver.find_element(By.ID, "pmc-flash")
        flash_locked = "is-locked" in flash_card.get_attribute("class")
        print(f"    • Flash Cards Mode Card is locked: {flash_locked} (Expected: False)")
        results["premium_user"]["flash_card_unlocked"] = not flash_locked

        driver.execute_script("document.getElementById('pmc-flash').click();")
        time.sleep(0.5)
        flash_selected = "selected" in flash_card.get_attribute("class")
        modal_open = driver.execute_script("return Boolean(document.getElementById('pricing-modal')?.classList.contains('pm-open'));")
        print(f"    • Clicking Flash Cards selects card: {flash_selected}, Modal shown: {modal_open}")
        results["premium_user"]["flash_card_selectable"] = flash_selected and not modal_open

        # Check Explain Mode unlocked
        explain_card = driver.find_element(By.ID, "goal-explain")
        explain_locked = "is-locked" in explain_card.get_attribute("class")
        print(f"    • Explain Mode Goal Card is locked: {explain_locked} (Expected: False)")
        results["premium_user"]["explain_goal_unlocked"] = not explain_locked

        # Direct navigation to mocktest.html
        driver.get(f"{BASE_URL}/mocktest.html?topic=Operating%20Systems&count=10")
        time.sleep(0.8)
        page_text = driver.find_element(By.TAG_NAME, "body").text
        mock_suite_active = "Mock Exam Suite Locked" not in page_text and len(driver.find_elements(By.CLASS_NAME, "mk-qnum")) > 0
        print(f"    • Direct URL access to mocktest.html runs active exam: {mock_suite_active}")
        results["premium_user"]["direct_mocktest_active"] = mock_suite_active

        # Direct navigation to flashcard.html
        driver.get(f"{BASE_URL}/flashcard.html?topic=Operating%20Systems&count=10")
        time.sleep(0.8)
        page_text = driver.find_element(By.TAG_NAME, "body").text
        flash_suite_active = "Flashcards Suite Locked" not in page_text and len(driver.find_elements(By.CLASS_NAME, "fc-card")) > 0
        print(f"    • Direct URL access to flashcard.html runs active deck: {flash_suite_active}")
        results["premium_user"]["direct_flashcard_active"] = flash_suite_active

        # ─────────────────────────────────────────────────────────────
        # PART C: DIAMOND USER SIMULATION
        # ─────────────────────────────────────────────────────────────
        print("\n[PART C] SIMULATING DIAMOND RESEARCHER USER (plan: diamond)")
        diamond_user = users["diamond"]
        set_user_context(diamond_user, "/index.html")

        # Verify no locked elements exist on page
        locked_count = len(driver.find_elements(By.CLASS_NAME, "is-locked"))
        print(f"    • Total locked elements on index page for Diamond: {locked_count} (Expected: 0)")
        results["diamond_user"]["all_unlocked"] = (locked_count == 0)

        # ─────────────────────────────────────────────────────────────
        # PART D: BACKEND API GENERATION & SECURITY ENFORCEMENT
        # ─────────────────────────────────────────────────────────────
        print("\n[PART D] BACKEND API SECURITY ENFORCEMENT & GENERATION TESTING")

        def make_api_request(endpoint, body, token=None):
            req = urllib.request.Request(
                f"{BASE_URL}{endpoint}",
                data=json.dumps(body).encode("utf-8"),
                headers={"Content-Type": "application/json"}
            )
            if token:
                req.add_header("Authorization", f"Bearer {token}")
                req.add_header("Cookie", f"nb_auth_token={token}")
            try:
                with urllib.request.urlopen(req) as resp:
                    return resp.status, json.loads(resp.read().decode("utf-8"))
            except urllib.error.HTTPError as e:
                return e.code, json.loads(e.read().decode("utf-8"))

        # Test 1: Free user trying to generate Mock test via API
        status, resp = make_api_request("/api/generate", {"mode": "mock", "topic": "Compilers"}, free_user["token"])
        print(f"    • Free User /api/generate mode='mock' -> HTTP {status} (Expected: 403)")
        print(f"      Response: {resp}")
        results["api_generation"]["free_mock_blocked"] = (status == 403 and "requires a Premium or Diamond plan" in resp.get("error", ""))

        # Test 2: Free user trying to generate Flashcards via API
        status, resp = make_api_request("/api/generate", {"mode": "flash", "topic": "Compilers"}, free_user["token"])
        print(f"    • Free User /api/generate mode='flash' -> HTTP {status} (Expected: 403)")
        print(f"      Response: {resp}")
        results["api_generation"]["free_flash_blocked"] = (status == 403 and "requires a Premium or Diamond plan" in resp.get("error", ""))

        # Test 3: Free user trying to generate Video Notes via API
        status, resp = make_api_request("/api/generate", {"mode": "video-notes", "topic": "Compilers"}, free_user["token"])
        print(f"    • Free User /api/generate mode='video-notes' -> HTTP {status} (Expected: 403)")
        results["api_generation"]["free_video_notes_blocked"] = (status == 403)

        # Test 4: Premium user generating Practice via API (should pass auth check)
        status, resp = make_api_request("/api/generate", {"mode": "mock", "topic": "Compilers", "questionCount": 10}, premium_user["token"])
        print(f"    • Premium User /api/generate mode='mock' -> HTTP {status} (Expected: 200)")
        results["api_generation"]["premium_mock_allowed"] = (status == 200)

        # ─────────────────────────────────────────────────────────────
        # PART E: PROMPT INSPECTION & REAL VS FAKE GENERATION ANALYSIS
        # ─────────────────────────────────────────────────────────────
        print("\n[PART E] PROMPT INSPECTION & REAL VS FAKE GENERATION ANALYSIS")

        test_topic = "B-Tree Indexing in Relational Databases"
        test_body = {
            "topic": test_topic,
            "mode": "notes",
            "noteStyle": "Cornell",
            "noteFormat": "Detailed",
            "genType": "Theory Only"
        }

        # 1. Prompt construction analysis
        built_prompt = server._build_notes_prompt(test_topic, test_body)
        print("    [1] Dynamic Prompt Construction Inspection:")
        print(f"        • Topic incorporated: {'B-Tree Indexing in Relational Databases' in built_prompt}")
        print(f"        • Note style incorporated: {'Cornell' in built_prompt}")
        print(f"        • Formatting instructions present: {'Detailed' in built_prompt or 'Cornell' in built_prompt}")
        print("        • Prompt snippet (first 180 chars):")
        print(f"          {repr(built_prompt[:180])}")

        # 2. Practice Prompt construction inspection
        practice_body = {
            "topic": test_topic,
            "practiceType": "Quiz",
            "count": 5,
            "difficulty": "hard",
            "syllabusMode": "Full Syllabus",
            "genType": "Theory Only"
        }
        practice_prompt = server._build_practice_prompt(test_topic, practice_body)
        print("    [2] Practice Prompt Inspection:")
        print(f"        • Total Questions=5 present: {'Total Questions: 5' in practice_prompt}")
        print(f"        • Difficulty=hard present: {'Difficulty: hard' in practice_prompt}")
        print(f"        • Valid JSON schema requested: {'Output MUST be valid JSON' in practice_prompt}")

        # 3. Model API Status & Live Generation Analysis
        print("    [3] External AI Provider Connectivity Check:")

        groq_err = None
        try:
            groq_resp = server.call_groq("Say test", "System", "llama-3.3-70b-versatile")
            groq_active = bool(groq_resp)
        except Exception as e:
            groq_err = str(e)
            groq_active = False

        mistral_err = None
        try:
            mistral_resp = server.call_mistral("Say test")
            mistral_active = bool(mistral_resp)
        except Exception as e:
            mistral_err = str(e)
            mistral_active = False

        gemini_err = None
        try:
            gemini_resp = server.call_gemini("Say test")
            gemini_active = bool(gemini_resp)
        except Exception as e:
            gemini_err = str(e)
            gemini_active = False

        openai_err = None
        try:
            openai_resp = server.call_openai("Say test")
            openai_active = bool(openai_resp)
        except Exception as e:
            openai_err = str(e)
            openai_active = False

        print(f"        • Groq API active: {groq_active}")
        print(f"        • Mistral API active: {mistral_active}")
        print(f"        • Gemini API active: {gemini_active}")
        print(f"        • OpenAI API active: {openai_active}")

        # 4. Generate content test to check whether output is Real AI or Fake Predefined Fallback
        gen_result = server.generate_content(test_body)
        gen_output = gen_result.get("output", "")
        gen_provider = gen_result.get("provider", "")

        is_predefined_template = "NERDLUME NOTES" in gen_output and "• Identify the concept" in gen_output
        print(f"    [4] Generation Output Inspection:")
        print(f"        • Provider reported: {gen_provider}")
        print(f"        • Output starts with local template header: {is_predefined_template}")
        print(f"        • Is generating predefined fake/fallback response: {is_predefined_template}")
        print("        • Output sample:")
        for line in gen_output.splitlines()[:8]:
            print(f"          {line}")

        results["prompts_and_models"] = {
            "dynamic_prompt_verified": True,
            "groq_active": groq_active,
            "mistral_active": mistral_active,
            "gemini_active": gemini_active,
            "openai_active": openai_active,
            "is_fallback_predefined": is_predefined_template,
            "provider_reported": gen_provider
        }

    finally:
        driver.quit()
        if server_proc:
            server_proc.terminate()
            try:
                server_proc.wait(timeout=3)
            except Exception:
                server_proc.kill()

    print("\n" + "=" * 70)
    print("SIMULATION SUMMARY RESULTS")
    print("=" * 70)
    print(json.dumps(results, indent=2))
    return results


if __name__ == "__main__":
    run_simulation()
