import os
import json
import html
import re
import urllib.request
import urllib.error
from urllib.parse import quote_plus, urlparse
from dotenv import load_dotenv
# type: ignore
from langchain_google_genai import ChatGoogleGenerativeAI
# type: ignore
from langchain_core.prompts import PromptTemplate

# Muat .env baik dari folder backend/ maupun root project agar selalu terbaca
_current_dir = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(_current_dir, ".env"))
load_dotenv(os.path.join(_current_dir, "..", ".env"))

# Pass the API key explicitly since the .env uses GEMINI_API_KEY instead of GOOGLE_API_KEY
api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")

# We use gemini-3.6-flash to match the correct API version endpoint
llm = ChatGoogleGenerativeAI(
    model="gemini-3.6-flash",
    temperature=0.2,
    google_api_key=api_key or " placeholder_key_if_unset ",
    max_retries=0
) if api_key else None

prompt_template = PromptTemplate(
    input_variables=["claim", "search_results"],
    template="""Anda adalah sistem asisten pengecekan fakta (HoaxBuster) yang profesional.
Tugas Anda adalah memverifikasi klaim atau berita berikut berdasarkan hasil pencarian web yang diberikan.

KLAIM / BERITA DARI PENGGUNA:
{claim}

HASIL PENCARIAN WEB TERBARU:
{search_results}

Berdasarkan data di atas, tentukan apakah klaim tersebut hoaks, fakta, atau sebagian fakta.
Anda HARUS membalas HANYA dengan format JSON persis seperti di bawah ini, tanpa markdown dan tanpa teks lain:
{{
  "status": "hoax",
  "confidence": 95,
  "reasoning": "Alasan singkat mengapa berita ini hoaks/fakta berdasarkan sumber..."
}}
Catatan: "status" hanya boleh bernilai "hoax", "fact", atau "partial". "confidence" adalah persentase (0-100).
"""
)

# Daftar kata hubung / basa-basi pesan berantai Bahasa Indonesia (Stopwords)
INDONESIAN_STOPWORDS = {
    "assalamualaikum", "wr", "wb", "warahmatullahi", "wabarakatuh", "salam",
    "mohon", "izin", "ijin", "meneruskan", "teruskan", "info", "informasi",
    "penting", "sekedar", "sekadar", "mengingatkan", "hati", "hati2", "waspada",
    "sebarkan", "bagikan", "share", "viral", "viralkan", "berita", "grup",
    "sebelah", "tetangga", "tolong", "bantu", "broadcast", "pesan", "berantai",
    "yang", "di", "ke", "dari", "pada", "dalam", "untuk", "dengan", "dan",
    "atau", "ini", "itu", "tersebut", "adalah", "yaitu", "yakni", "bahwa",
    "jika", "bila", "kalau", "karena", "sebab", "oleh", "sebagai", "agar",
    "supaya", "akan", "sudah", "telah", "sedang", "masih", "belum", "tidak",
    "bukan", "jangan", "ada", "bisa", "dapat", "harus", "wajib", "sangat",
    "sekali", "lebih", "paling", "juga", "pun", "saja", "hanya", "lagi",
    "para", "semua", "seluruh", "setiap", "tiap", "kami", "kita", "saya",
    "aku", "anda", "kamu", "काला", "mereka", "beliau", "ia", "dia", "nya"
}


def fetch_url_content(url: str) -> dict:
    """
    Mengekstrak judul dan isi teks utama dari sebuah URL berita (Web Scraping ringan).
    Mengembalikan dict {'title': str, 'content': str} atau {} jika gagal/bukan URL.
    """
    result = {"title": "", "content": ""}
    try:
        req = urllib.request.Request(
            url,
            headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
            },
        )
        with urllib.request.urlopen(req, timeout=6) as response:
            content_type = response.headers.get("Content-Type", "").lower()
            if "text/html" not in content_type and "application/xhtml" not in content_type:
                return result
            raw_html = response.read(250_000).decode("utf-8", errors="ignore")

        # 1. Coba ambil OpenGraph Title / Meta Title / <title>
        og_title = re.search(
            r'<meta[^>]+property=["\']og:title["\'][^>]+content=["\']([^"\']+)["\']',
            raw_html,
            re.IGNORECASE,
        ) or re.search(
            r'<meta[^>]+content=["\']([^"\']+)["\'][^>]+property=["\']og:title["\']',
            raw_html,
            re.IGNORECASE,
        )
        if og_title:
            result["title"] = html.unescape(og_title.group(1)).strip()
        else:
            title_tag = re.search(r"<title[^>]*>(.*?)</title>", raw_html, re.IGNORECASE | re.DOTALL)
            if title_tag:
                result["title"] = html.unescape(re.sub(r"\s+", " ", title_tag.group(1))).strip()

        # 2. Ambil OpenGraph Description / Meta Description
        meta_desc = re.search(
            r'<meta[^>]+(?:name|property)=["\'](?:og:description|description)["\'][^>]+content=["\']([^"\']+)["\']',
            raw_html,
            re.IGNORECASE,
        ) or re.search(
            r'<meta[^>]+content=["\']([^"\']+)["\'][^>]+(?:name|property)=["\'](?:og:description|description)["\']',
            raw_html,
            re.IGNORECASE,
        )
        desc_text = html.unescape(meta_desc.group(1)).strip() if meta_desc else ""

        # 3. Bersihkan script/style dan ambil paragraf <p> utama
        cleaned_html = re.sub(r"<(script|style|noscript|header|footer|nav)[^>]*>.*?</\1>", " ", raw_html, flags=re.IGNORECASE | re.DOTALL)
        paragraphs = re.findall(r"<p[^>]*>(.*?)</p>", cleaned_html, flags=re.IGNORECASE | re.DOTALL)
        clean_paragraphs = []
        for p in paragraphs:
            text_p = html.unescape(re.sub(r"<[^>]+>", " ", p))
            text_p = re.sub(r"\s+", " ", text_p).strip()
            if len(text_p) > 40:
                clean_paragraphs.append(text_p)
            if len(" ".join(clean_paragraphs)) > 600:
                break

        body_text = " ".join(clean_paragraphs)
        combined_content = f"{desc_text}. {body_text}".strip(". ")
        result["content"] = combined_content[:700]
    except Exception as e:
        print(f"Info: Gagal mengambil konten langsung dari URL ({url}): {e}")
    return result


def build_curated_references(query: str) -> list:
    """
    Build guaranteed-valid reference URLs.
    Using Google Search and actual TurnBackHoax URL to avoid 404s.
    """
    encoded = quote_plus(query)
    return [
        {
            "url": f"https://www.google.com/search?q=cek+fakta+{encoded}",
            "title": f"Penelusuran Google: Cek Fakta {query[:50]}...",
            "source_api": "Fallback Search"
        },
        {
            "url": f"https://turnbackhoax.id/?search={encoded}",
            "title": f"Masyarakat Anti Fitnah Indonesia (MAFINDO): {query[:50]}...",
            "source_api": "Fallback Search"
        }
    ]


def try_google_fact_check(query: str) -> list:
    """Try Google Fact Check API. Returns list of {url, title, snippet, source_api} or [] on failure."""
    references = []
    try:
        fact_check_key = os.getenv("GOOGLE_FACT_CHECK_API_KEY")
        if not fact_check_key:
            return references
            
        url = f"https://factchecktools.googleapis.com/v1alpha1/claims:search?query={quote_plus(query)}&languageCode=id&key={fact_check_key}"
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=5) as response:
            data = json.loads(response.read().decode())
            claims = data.get('claims', [])
            for claim in claims:
                claim_text = (claim.get('text') or '').strip()
                claimant = (claim.get('claimant') or '').strip()
                for review in claim.get('claimReview', []):
                    ref_url = review.get('url', '').strip()
                    ref_title = (review.get('title') or claim_text or '').strip()
                    rating = review.get('textualRating', '').strip()
                    publisher = review.get('publisher', {}).get('name', 'Pemeriksa Fakta').strip()
                    if ref_url and ref_url.startswith('http'):
                        snippet_parts = []
                        if claim_text:
                            snippet_parts.append(f"Klaim: \"{claim_text}\"")
                        if claimant:
                            snippet_parts.append(f"Sumber Klaim: {claimant}")
                        if rating:
                            snippet_parts.append(f"Hasil Verifikasi ({publisher}): {rating}")
                        rich_snippet = " | ".join(snippet_parts) if snippet_parts else f"Rating: {rating}"
                        references.append({
                            "url": ref_url,
                            "title": ref_title[:120],
                            "snippet": rich_snippet[:350],
                            "source_api": "Google Fact Check Tools"
                        })
                        if len(references) >= 3:
                            return references
    except Exception as e:
        print(f"Google Fact Check search error: {e}")
    return references


def try_tavily(query: str) -> list:
    """Try Tavily Search API for AI-optimized web results."""
    references = []
    try:
        tavily_key = os.getenv("TAVILY_API_KEY")
        if not tavily_key:
            print("Tavily API key not found.")
            return references
            
        url = "https://api.tavily.com/search"
        headers = {
            "Content-Type": "application/json"
        }
        data = {
            "api_key": tavily_key,
            "query": query,
            "search_depth": "basic",
            "include_answer": False,
            "max_results": 3
        }
        
        req = urllib.request.Request(url, headers=headers, data=json.dumps(data).encode("utf-8"))
        with urllib.request.urlopen(req, timeout=8) as response:
            data = json.loads(response.read().decode())
            for result in data.get('results', []):
                ref_url = result.get('url', '').strip()
                ref_title = result.get('title', '').strip()
                ref_snippet = result.get('content', '').strip()
                if ref_url and ref_url.startswith('http'):
                    references.append({
                        "url": ref_url,
                        "title": ref_title[:120],
                        "snippet": ref_snippet[:350],
                        "source_api": "Tavily Search API"
                    })
    except Exception as e:
        print(f"Tavily search error: {e}")
    return references


def try_wikipedia(query: str) -> list:
    """Try Wikipedia API for direct factual articles."""
    references = []
    try:
        clean_query = quote_plus(query.replace("hoaks", "").replace("fakta", "").strip())
        url = f"https://id.wikipedia.org/w/api.php?action=query&list=search&srsearch={clean_query}&utf8=&format=json&srlimit=2"
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=5) as response:
            data = json.loads(response.read().decode())
            for item in data.get('query', {}).get('search', []):
                title = item.get('title', '')
                snippet = item.get('snippet', '')
                snippet = re.sub(r'<[^>]+>', '', html.unescape(snippet))
                page_url = f"https://id.wikipedia.org/wiki/{quote_plus(title.replace(' ', '_'))}"
                references.append({
                    "url": page_url,
                    "title": f"Wikipedia: {title}",
                    "snippet": snippet[:250],
                    "source_api": "Wikipedia API"
                })
    except Exception as e:
        print(f"Wikipedia search error: {e}")
    return references


def extract_keywords(claim: str, llm=None) -> str:
    """
    Mengekstrak kata kunci penting (Query Formulation) dari klaim atau URL
    dengan menyaring stopwords/basa-basi pesan berantai agar Retrieval akurat.
    """
    try:
        original_claim = claim.strip()
        # Hapus URL dari teks klaim
        text_without_url = re.sub(r'http[s]?://\S+', ' ', original_claim)
        
        # Bersihkan karakter non-alfanumerik kecuali spasi
        tokens = re.findall(r'[a-zA-Z0-9]+', text_without_url)
        
        # Saring stopwords Bahasa Indonesia dan kata yang terlalu pendek (kecuali angka/singkatan penting)
        meaningful_words = []
        seen_lower = set()
        for w in tokens:
            w_lower = w.lower()
            if w_lower in INDONESIAN_STOPWORDS:
                continue
            if len(w_lower) <= 2 and not w_lower.isdigit():
                continue
            if w_lower not in seen_lower:
                meaningful_words.append(w)
                seen_lower.add(w_lower)
            if len(meaningful_words) >= 10:
                break
                
        keywords = " ".join(meaningful_words)
        
        # Jika hasil penyaringan terlalu pendek tapi teks asli ada, ambil kata tanpa filter ketat
        if len(meaningful_words) < 2 and tokens:
            keywords = " ".join(tokens[:10])
        
        if not keywords.strip():
            # Jika pengguna hanya memasukkan URL, ekstrak kata bermakna dari path/slug URL
            urls = re.findall(r'http[s]?://\S+', original_claim)
            if urls:
                parsed = urlparse(urls[0])
                path_words = re.sub(r'[^a-zA-Z0-9]', ' ', parsed.path).split()
                slug_words = [
                    w for w in path_words
                    if len(w) > 2 and not w.isdigit() and w.lower() not in {"html", "htm", "php", "read", "news", "artikel", "articles", "berita", "detail", "post"}
                ]
                keywords = " ".join(slug_words[:10])
        
        # Pastikan tidak pernah mengembalikan string kosong agar API tidak error 400
        final_query = keywords.strip() if keywords.strip() else original_claim[:50].strip()
        return final_query if final_query else "berita terkini indonesia"
    except Exception as e:
        print(f"Keyword extraction error: {e}")
        return claim[:50].strip() or "berita terkini indonesia"


# Alias untuk menjaga kompatibilitas dengan endpoint /debug-search di main.py
def search_google_fact_check(query: str, max_results: int = 3) -> list:
    return try_google_fact_check(query)[:max_results]


def search_duckduckgo(query: str, max_results: int = 3) -> list:
    return try_tavily(query)[:max_results]


def call_groq_api(prompt_text: str) -> str:
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise ValueError("GROQ_API_KEY not found")
    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "User-Agent": "HoaxBusterApp/1.0"
    }
    data = {
        "model": "llama-3.1-8b-instant",
        "messages": [{"role": "user", "content": prompt_text}],
        "temperature": 0.2,
        "response_format": {"type": "json_object"}
    }
    req = urllib.request.Request(url, headers=headers, data=json.dumps(data).encode("utf-8"))
    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            result = json.loads(response.read().decode("utf-8"))
            return result["choices"][0]["message"]["content"]
    except urllib.error.HTTPError as e:
        error_body = e.read().decode("utf-8")
        raise ValueError(f"HTTP {e.code}: {error_body}")


def call_openrouter_api(prompt_text: str) -> str:
    api_key = os.getenv("OPENROUTER_API_KEY")
    if not api_key:
        raise ValueError("OPENROUTER_API_KEY not found")
    url = "https://openrouter.ai/api/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://hoaxbuster.id",
        "X-Title": "HoaxBuster App"
    }
    
    # Menggunakan model-model gratis terbaru di OpenRouter
    models_to_try = [
        "openrouter/free", # Fitur Auto-Router dari OpenRouter untuk model gratis
        "deepseek/deepseek-chat:free", # DeepSeek V3 (Sangat Cerdas)
        "meta-llama/llama-3.2-3b-instruct:free", # LLaMA 3.2 terbaru
        "google/gemini-2.0-flash-exp:free" # Gemini 2.0 Flash
    ]
    
    last_error = None
    for model_id in models_to_try:
        data = {
            "model": model_id,
            "messages": [{"role": "user", "content": prompt_text}],
            "temperature": 0.2,
            "response_format": {"type": "json_object"}
        }
        try:
            req = urllib.request.Request(url, headers=headers, data=json.dumps(data).encode("utf-8"))
            with urllib.request.urlopen(req, timeout=10) as response:
                result = json.loads(response.read().decode("utf-8"))
                return result["choices"][0]["message"]["content"]
        except urllib.error.HTTPError as e:
            last_error = e
            error_body = e.read().decode("utf-8")
            print(f"[OpenRouter] Gagal pada model {model_id}. Error {e.code}: {error_body}")
            continue # Tetap lanjut mencoba model berikutnya agar aman
            
    raise ValueError(f"Semua model gratis OpenRouter gagal. Error terakhir: {last_error}")


def parse_llm_json(raw_content: str) -> dict:
    """
    Mengekstrak objek JSON dengan aman meskipun LLM membungkusnya
    dengan teks pengantar atau blok markdown ```json ... ```.
    """
    content = str(raw_content).strip()
    if content.startswith("```json"):
        content = content[7:]
        if content.endswith("```"):
            content = content[:-3]
    elif content.startswith("```"):
        content = content[3:]
        if content.endswith("```"):
            content = content[:-3]
    content = content.strip()

    try:
        return json.loads(content)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", content, re.DOTALL)
        if match:
            return json.loads(match.group(0))
        raise


async def analyze_hoax(text: str, is_category: bool = False) -> dict:
    try:
        effective_claim = text.strip()
        urls_in_input = re.findall(r'http[s]?://\S+', effective_claim)

        # Pra-pemrosesan: Jika pengguna memasukkan URL, ekstrak judul & isi berita dari halaman web tersebut
        if urls_in_input and not is_category:
            scraped = fetch_url_content(urls_in_input[0])
            if scraped.get("title") or scraped.get("content"):
                scraped_title = scraped.get("title", "")
                scraped_body = scraped.get("content", "")
                print(f"Berhasil mengekstrak konten URL: {scraped_title}")
                text_without_url = re.sub(r'http[s]?://\S+', '', effective_claim).strip()
                if text_without_url:
                    effective_claim = f"{text_without_url}\n(Judul Artikel URL: {scraped_title}. Ringkasan Isi: {scraped_body})"
                else:
                    effective_claim = f"{scraped_title}. {scraped_body}".strip()

        # Tahap 1: Query Formulation (Ekstraksi kata kunci untuk Retrieval)
        search_source_text = scraped.get("title") if (urls_in_input and not is_category and scraped.get("title")) else effective_claim
        search_keywords = extract_keywords(search_source_text, llm)
        print(f"Original text: {text}")
        print(f"Extracted keywords for search: {search_keywords}")

        # Tahap 2: Retrieval (Mengambil bukti faktual dari sumber eksternal)
        retrieved_references = []

        # 2a. Cari di Google Fact Check Tools terlebih dahulu
        gfc_query = search_keywords if not is_category else f"{search_keywords} kominfo"
        retrieved_references = try_google_fact_check(gfc_query)
        print(f"Google Fact Check: {len(retrieved_references)} results")

        # 2b. Jika referensi belum mencapai 3, perkaya dengan Tavily Search API
        if len(retrieved_references) < 3:
            tavily_query = f"cek fakta {search_keywords}" if not is_category else f"hoaks {search_keywords} kominfo"
            tavily_refs = try_tavily(tavily_query)
            existing = {r['url'] for r in retrieved_references}
            for r in tavily_refs:
                if r['url'] not in existing and len(retrieved_references) < 3:
                    retrieved_references.append(r)
            print(f"After Tavily: {len(retrieved_references)} results")

        # 2c. Jika masih belum ada konteks faktual yang cukup, coba cari artikel ensiklopedia Wikipedia
        if len(retrieved_references) < 2 and not is_category:
            wiki_refs = try_wikipedia(search_keywords)
            existing = {r['url'] for r in retrieved_references}
            for w in wiki_refs:
                if w['url'] not in existing and len(retrieved_references) < 3:
                    retrieved_references.append(w)

        # Tahap 3: Augmentation (Menyusun konteks murni dari hasil Retrieval tanpa dicemari fallback link kosong)
        if retrieved_references:
            search_context = "\n".join([
                f"[{i+1}] Sumber: {r.get('source_api', 'Web')} | Judul: {r['title']} | Ringkasan Fakta: {r.get('snippet', '')} ({r['url']})"
                for i, r in enumerate(retrieved_references)
            ])
        else:
            search_context = "Tidak ditemukan artikel verifikasi spesifik di mesin pencari untuk kata kunci ini. Gunakan penalaran faktual yang objektif."

        # Tahap 4: Generation (Analisis menggunakan Multi-LLM Fallback)
        if is_category:
            custom_prompt = PromptTemplate(
                input_variables=["category", "search_results"],
                template="""Anda adalah sistem asisten pengecekan fakta (HoaxBuster) yang terhubung dengan data Kementerian Kominfo (Komdigi) RI.
Pengguna ingin melihat contoh hoaks terbaru terkait kategori: {category}

Berdasarkan hasil pencarian web berikut:
{search_results}

Tugas Anda adalah:
1. Temukan 1 berita hoaks yang spesifik dan relevan dengan kategori tersebut yang telah dibantah oleh Kominfo/Komdigi.
2. Jika tidak ada yang spesifik dari Kominfo di hasil pencarian, buatlah rangkuman edukatif mengenai ciri-ciri hoaks di kategori tersebut.
3. Anda HARUS membalas HANYA dengan format JSON persis seperti di bawah ini, tanpa markdown dan tanpa teks lain:
{{
  "title": "Judul spesifik hoaks (misal: [HOAKS] Vaksin menyebabkan...)",
  "status": "hoax",
  "confidence": 98,
  "reasoning": "Penjelasan detail mengapa berita ini hoaks, fakta sebenarnya dari Kominfo, dan himbauan kepada masyarakat."
}}
Catatan: "status" harus selalu "hoax". Pastikan JSON valid.
"""
            )
            prompt = custom_prompt.format(category=text, search_results=search_context)
        else:
            prompt = prompt_template.format(claim=effective_claim, search_results=search_context)

        try:
            print("Mencoba analisis dengan Groq (LLaMA 3.1)...")
            raw_content = call_groq_api(prompt)
            print("Berhasil menggunakan Groq.")
        except Exception as e_groq:
            print(f"Groq gagal ({e_groq}), menggunakan fallback Gemini...")
            try:
                if llm is None:
                    raise ValueError("GEMINI_API_KEY tidak ditemukan")
                print("Mencoba analisis langsung dengan Gemini...")
                response = llm.invoke(prompt)
                raw_content = response.content
                if isinstance(raw_content, list):
                    raw_content = str(raw_content[0].get("text", "")) if raw_content else ""
                else:
                    raw_content = str(raw_content)
                print("Berhasil menggunakan Gemini.")
            except Exception as e_gemini:
                print(f"Gemini gagal ({e_gemini}), menggunakan fallback OpenRouter...")
                try:
                    print("Mencoba analisis dengan OpenRouter (OpenRouter Auto Free)...")
                    raw_content = call_openrouter_api(prompt)
                    print("Berhasil menggunakan OpenRouter.")
                except Exception as e_or:
                    print(f"Semua API GAGAL: {e_or}")
                    raw_content = "{}"

        result = parse_llm_json(raw_content)

        # Validasi struktur output agar aplikasi frontend tidak pernah crash
        if result.get("status") not in ("hoax", "fact", "partial"):
            result["status"] = "partial"
        try:
            result["confidence"] = max(0, min(100, int(result.get("confidence", 75))))
        except (ValueError, TypeError):
            result["confidence"] = 75
        if not result.get("reasoning"):
            result["reasoning"] = "Analisis selesai dilakukan berdasarkan referensi yang tersedia."

        # Tahap 5: Penyusunan Referensi Akhir untuk UI (Post-Processing)
        final_references = list(retrieved_references)

        if result.get("status") == "fact":
            filtered_refs = []
            for r in final_references:
                url_lower = r['url'].lower()
                if "turnbackhoax" in url_lower or "cekfakta" in url_lower or "google.com/search" in url_lower:
                    continue
                filtered_refs.append(r)
            
            if len(filtered_refs) < 3:
                wiki_refs = try_wikipedia(search_keywords)
                for w in wiki_refs:
                    if w['url'] not in [ref['url'] for ref in filtered_refs]:
                        filtered_refs.append(w)
                        if len(filtered_refs) >= 3:
                            break
                            
            result["references"] = filtered_refs[:3]
        else:
            # Hanya tambahkan fallback link kurasi SETELAH LLM selesai menganalisis
            if len(final_references) < 3:
                curated = build_curated_references(search_keywords)
                existing = {r['url'] for r in final_references}
                for c in curated:
                    if c['url'] not in existing and len(final_references) < 3:
                        final_references.append(c)
            result["references"] = final_references[:3]

        print(f"Returning {len(result['references'])} references:")
        for ref in result["references"]:
            print(f"  - {ref['url']}")

        return result

    except Exception as e:
        error_msg = str(e)
        print(f"Error in RAG engine: {error_msg}")

        reasoning = "Sistem gagal menghubungi server pencarian atau AI. Silakan coba lagi nanti."
        if "429" in error_msg or "RESOURCE_EXHAUSTED" in error_msg:
            reasoning = "Batas penggunaan AI gratis (Quota) Anda saat ini telah tercapai. Silakan tunggu sekitar 1 menit sebelum mencoba lagi."

        return {
            "status": "partial",
            "confidence": 50,
            "reasoning": reasoning,
            "references": build_curated_references(text)
        }
