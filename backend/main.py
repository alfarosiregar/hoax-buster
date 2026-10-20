import os
# type: ignore
from fastapi import FastAPI
# type: ignore
from fastapi.middleware.cors import CORSMiddleware
# type: ignore
from pydantic import BaseModel
from rag_engine import analyze_hoax

app = FastAPI(title="HoaxBuster API")

# Allow CORS for Expo
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class AnalyzeRequest(BaseModel):
    text: str
    is_category: bool = False

@app.get("/")
def root():
    return {"message": "HoaxBuster RAG API is running"}

@app.post("/analyze")
async def analyze(req: AnalyzeRequest):
    result = await analyze_hoax(req.text, req.is_category)
    return result

@app.get("/debug-search")
async def debug_search(q: str = "hoaks vaksin indonesia"):
    """Debug endpoint: test what search APIs actually return"""
    from rag_engine import search_google_fact_check, search_duckduckgo
    gfc = search_google_fact_check(q, max_results=3)
    ddg = search_duckduckgo(f"cek fakta {q}", max_results=3)
    return {
        "query": q,
        "google_fact_check": gfc,
        "duckduckgo": ddg,
        "total": len(gfc) + len(ddg)
    }


import urllib.request
import urllib.parse
import json

@app.get("/trending-hoaxes")
async def trending_hoaxes(query: str = "hoaks indonesia"):
    try:
        fact_check_key = os.getenv("GOOGLE_FACT_CHECK_API_KEY")
        if not fact_check_key:
            print("Warning: GOOGLE_FACT_CHECK_API_KEY is not set.")
            return {"articles": []}
            
        query_encoded = urllib.parse.quote(query)
        url = f"https://factchecktools.googleapis.com/v1alpha1/claims:search?query={query_encoded}&languageCode=id&key={fact_check_key}"
        
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode())
            
        formatted_results = []
        claims = data.get('claims', [])
        for i, claim in enumerate(claims[:20]):
            reviews = claim.get('claimReview', [])
            if not reviews:
                continue
            review = reviews[0]
            
            # Use claim text or review title
            title = review.get('title') or claim.get('text')
            publisher = review.get('publisher', {}).get('name', 'CekFakta')
            url = review.get('url', '')
            rating = review.get('textualRating', 'Salah')
            date = claim.get('claimDate') or review.get('reviewDate') or ''
            
            formatted_results.append({
                "id": f"hoax_{i}",
                "source": {"name": publisher},
                "title": title,
                "description": f"Klaim Beredar: {claim.get('text')} - Rating: {rating}",
                "urlToImage": "https://images.unsplash.com/photo-1588681664899-f142ff2dc9b1?q=80&w=600&auto=format&fit=crop",
                "url": url,
                "publishedAt": date
            })
            
        return {"articles": formatted_results}
    except Exception as e:
        print(f"Error fetching trending hoaxes: {e}")
        return {"articles": []}
