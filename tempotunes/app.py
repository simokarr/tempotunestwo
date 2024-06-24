import os
import base64
import json
from dotenv import load_dotenv
from flask import Flask, redirect, request, session, url_for, jsonify
from flask_session import Session
from requests import post, get
import spotipy
from spotipy.oauth2 import SpotifyOAuth

load_dotenv()

app = Flask(__name__)
app.secret_key = 'random_secret_key'  # Replace with a real secret key
app.config['SESSION_TYPE'] = 'filesystem'
Session(app)

client_id = os.getenv("SPOTIFY_CLIENT_ID")
client_secret = os.getenv("SPOTIFY_CLIENT_SECRET")
redirect_uri = "http://localhost:3000/callback"

def get_token():
    auth_string = client_id + ":" + client_secret
    auth_bytes = auth_string.encode("utf-8")
    auth_base64 = str(base64.b64encode(auth_bytes), "utf-8")

    url = "https://accounts.spotify.com/api/token"
    headers = {
        "Authorization": "Basic " + auth_base64,
        "Content-Type": "application/x-www-form-urlencoded"
    }
    data = {"grant_type": "client_credentials"}
    result = post(url, headers=headers, data=data)
    json_result = json.loads(result.content)
    token = json_result["access_token"]
    return token

def get_auth_header(token):
    return {"Authorization": "Bearer " + token}

def search_for_artist(token, artist_name):
    url = "https://api.spotify.com/v1/search"
    headers = get_auth_header(token)
    query = f"?q={artist_name}&type=artist&limit=1"
    query_url = url + query
    result = get(query_url, headers=headers)
    json_result = json.loads(result.content)
    return json_result

@app.route('/')
def index():
    sp_oauth = SpotifyOAuth(client_id, client_secret, redirect_uri, scope='user-read-email user-read-private')
    auth_url = sp_oauth.get_authorize_url()
    return f'<h2><a href="{auth_url}">Login with Spotify</a></h2>'

@app.route('/callback')
def callback():
    sp_oauth = SpotifyOAuth(client_id, client_secret, redirect_uri, scope='user-read-email user-read-private')
    session.clear()
    code = request.args.get('code')
    token_info = sp_oauth.get_access_token(code)
    session['token_info'] = token_info
    return redirect(url_for('profile'))

@app.route('/profile')
def profile():
    token_info = session.get('token_info', None)
    if not token_info:
        return redirect(url_for('index'))
    
    sp = spotipy.Spotify(auth=token_info['access_token'])
    user_profile = sp.current_user()
    return f'<h1>Logged in as {user_profile["display_name"]}</h1>'

@app.route('/search', methods=['GET'])
def search():
    artist_name = request.args.get('artist')
    if not artist_name:
        return jsonify({'error': 'No artist name provided'}), 400

    token = get_token()
    search_result = search_for_artist(token, artist_name)
    return jsonify(search_result)

if __name__ == '__main__':
    app.run(debug=True, port=3000)
