# email_service.py
import os
import requests
from django.conf import settings
from django.urls import reverse
from dotenv import load_dotenv

load_dotenv()

class BrevoEmailService:
    def __init__(self):
        self.api_key = os.getenv('BREVO_API_KEY')
        self.base_url = 'https://api.brevo.com/v3/smtp/email'
    
    def send_invitation_email(self, invitation, inviter_name, team_name):
        """Send team invitation email via Brevo"""
        
        # Create acceptance and rejection URLs
        acceptance_url = f"http://localhost:3000/invitation/accept/{invitation.token}"
        rejection_url = f"http://localhost:3000/invitation/reject/{invitation.token}"
        
        # Use a more personal subject line
        subject = f"{inviter_name} has invited you to join {team_name} on Shout Sync!"
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
                
                * {{
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }}
                
                body {{
                    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    line-height: 1.6;
                    color: #334155;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    min-height: 100vh;
                    padding: 20px;
                }}
                
                .container {{
                    max-width: 600px;
                    margin: 0 auto;
                    background: white;
                    border-radius: 20px;
                    overflow: hidden;
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
                }}
                
                .header {{
                    background: linear-gradient(135deg, #2563eb, #7c3aed);
                    color: white;
                    padding: 50px 40px;
                    text-align: center;
                    position: relative;
                }}
                
                .header::before {{
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 100" fill="rgba(255,255,255,0.1)"><polygon points="1000,100 1000,0 0,100"/></svg>');
                    background-size: cover;
                }}
                
                .logo-container {{
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 15px;
                    margin-bottom: 20px;
                }}
                
                .logo-image {{
                    width: 60px;
                    height: 60px;
                    border-radius: 12px;
                    object-fit: cover;
                    border: 3px solid rgba(255, 255, 255, 0.3);
                    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2);
                }}
                
                .logo-text {{
                    font-size: 2.2rem;
                    font-weight: 700;
                    letter-spacing: -0.5px;
                    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
                }}
                
                .title {{
                    font-size: 2rem;
                    font-weight: 600;
                    margin-bottom: 10px;
                    letter-spacing: -0.5px;
                    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
                }}
                
                .subtitle {{
                    font-size: 1.2rem;
                    font-weight: 400;
                    opacity: 0.9;
                    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
                }}
                
                .content {{
                    padding: 50px 40px;
                    background: #f8fafc;
                }}
                
                .welcome-section {{
                    background: white;
                    padding: 35px 30px;
                    border-radius: 16px;
                    margin-bottom: 35px;
                    box-shadow: 0 6px 12px -1px rgba(0, 0, 0, 0.1);
                    border-left: 5px solid #2563eb;
                    border-right: 1px solid #e2e8f0;
                    border-top: 1px solid #e2e8f0;
                    border-bottom: 1px solid #e2e8f0;
                }}
                
                .greeting {{
                    font-size: 1.4rem;
                    font-weight: 500;
                    margin-bottom: 18px;
                    color: #1e293b;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }}
                
                .greeting::before {{
                    content: '👋';
                    font-size: 1.6rem;
                }}
                
                .message {{
                    font-size: 1.1rem;
                    line-height: 1.7;
                    color: #475569;
                    margin-bottom: 15px;
                }}
                
                .highlight {{
                    color: #2563eb;
                    font-weight: 600;
                    background: linear-gradient(135deg, #2563eb, #7c3aed);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                }}
                
                .action-buttons {{
                    text-align: center;
                    margin: 45px 0;
                }}
                
                .button {{
                    display: inline-block;
                    padding: 18px 45px;
                    margin: 12px 18px;
                    text-decoration: none;
                    border-radius: 14px;
                    font-weight: 600;
                    font-size: 1.1rem;
                    transition: all 0.3s ease;
                    text-align: center;
                    min-width: 220px;
                    border: none;
                    cursor: pointer;
                    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
                }}
                
                .accept {{
                    background: linear-gradient(135deg, #10b981, #059669);
                    color: white !important;
                    box-shadow: 0 6px 20px rgba(16, 185, 129, 0.4);
                }}
                
                .accept:hover {{
                    transform: translateY(-3px);
                    box-shadow: 0 12px 30px rgba(16, 185, 129, 0.6);
                }}
                
                .reject {{
                    background: linear-gradient(135deg, #ef4444, #dc2626);
                    color: white !important;
                    box-shadow: 0 6px 20px rgba(239, 68, 68, 0.4);
                }}
                
                .reject:hover {{
                    transform: translateY(-3px);
                    box-shadow: 0 12px 30px rgba(239, 68, 68, 0.6);
                }}
                
                .features {{
                    background: white;
                    padding: 45px 35px;
                    border-radius: 18px;
                    margin: 35px 0;
                    box-shadow: 0 6px 12px -1px rgba(0, 0, 0, 0.1);
                    border: 1px solid #e2e8f0;
                }}
                
                .features-title {{
                    font-size: 1.5rem;
                    font-weight: 600;
                    margin-bottom: 30px;
                    color: #1e293b;
                    text-align: center;
                    background: linear-gradient(135deg, #2563eb, #7c3aed);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                }}
                
                .feature-grid {{
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 20px;
                    margin-top: 25px;
                }}
                
                .feature-item {{
                    display: flex;
                    align-items: center;
                    padding: 20px 18px;
                    background: linear-gradient(135deg, #f8fafc, #f1f5f9);
                    border-radius: 14px;
                    font-weight: 500;
                    transition: all 0.3s ease;
                    border: 2px solid #e2e8f0;
                    font-size: 1rem;
                    min-height: 70px;
                }}
                
                .feature-item:hover {{
                    transform: translateY(-3px);
                    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.12);
                    background: linear-gradient(135deg, #ffffff, #f8fafc);
                    border-color: #2563eb;
                }}
                
                .feature-item::before {{
                    content: '✓';
                    color: #10b981;
                    font-weight: bold;
                    margin-right: 15px;
                    font-size: 1.3rem;
                    background: rgba(16, 185, 129, 0.1);
                    padding: 6px;
                    border-radius: 8px;
                    min-width: 30px;
                    text-align: center;
                }}
                
                .footer {{
                    text-align: center;
                    padding: 35px;
                    background: white;
                    border-top: 2px solid #e2e8f0;
                    color: #64748b;
                    font-size: 0.95rem;
                }}
                
                .expiry-notice {{
                    background: linear-gradient(135deg, #fffbeb, #fef3c7);
                    border: 2px solid #f59e0b;
                    padding: 25px;
                    border-radius: 14px;
                    text-align: center;
                    margin: 30px 0;
                    color: #92400e;
                    font-weight: 600;
                    font-size: 1.1rem;
                    box-shadow: 0 4px 12px rgba(245, 158, 11, 0.15);
                }}
                
                .expiry-notice::before {{
                    content: '⏰';
                    font-size: 1.4rem;
                    margin-right: 10px;
                }}
                
                .contact-info {{
                    margin-top: 15px;
                    padding-top: 15px;
                    border-top: 1px solid #e2e8f0;
                }}
                
                @media (max-width: 600px) {{
                    .feature-grid {{
                        grid-template-columns: 1fr;
                        gap: 15px;
                    }}
                    
                    .button {{
                        display: block;
                        margin: 15px 0;
                        min-width: auto;
                        width: 100%;
                        padding: 16px 30px;
                    }}
                    
                    .header {{
                        padding: 40px 25px;
                    }}
                    
                    .content {{
                        padding: 35px 25px;
                    }}
                    
                    .title {{
                        font-size: 1.7rem;
                    }}
                    
                    .feature-item {{
                        padding: 18px 15px;
                        min-height: 65px;
                    }}
                    
                    .logo-container {{
                        flex-direction: column;
                        gap: 12px;
                    }}
                    
                    .logo-text {{
                        font-size: 2rem;
                    }}
                }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="logo-container">
                        <img src="https://res.cloudinary.com/dru5oqalj/image/upload/v1763725764/20251121_1607_Enhanced_Blue_Lips_remix_01kajzqx9te3wapax3bvr5tpc6-min_f0r8qs.png" 
                             alt="Shout Sync Logo" 
                             class="logo-image">
                        <div class="logo-text">Shout Sync</div>
                    </div>
                    <h1 class="title">You're Invited to Collaborate!</h1>
                    <p class="subtitle">Join your team on our powerful collaboration platform</p>
                </div>
                
                <div class="content">
                    <div class="welcome-section">
                        <p class="greeting">Hello there!</p>
                        <p class="message">
                            <span class="highlight">{inviter_name}</span> has invited you to join 
                            <span class="highlight">{team_name}</span> on Shout Sync.
                        </p>
                        <p class="message">
                            Shout Sync helps teams work smarter together with seamless project management, 
                            real-time communication, and AI-powered productivity tools.
                        </p>
                    </div>
                    
                    <div class="action-buttons">
                        <a href="{acceptance_url}" class="button accept">
                            ✅ Accept Invitation
                        </a>
                        <a href="{rejection_url}" class="button reject">
                            ❌ Decline Invitation
                        </a>
                    </div>
                    
                    <div class="expiry-notice">
                        This invitation will expire in 7 days
                    </div>
                    
                    <div class="features">
                        <h3 class="features-title">What awaits you on Shout Sync:</h3>
                        <div class="feature-grid">
                            <div class="feature-item">Project Management</div>
                            <div class="feature-item">Real-time Chat</div>
                            <div class="feature-item">File Sharing</div>
                            <div class="feature-item">Task Tracking</div>
                            <div class="feature-item">AI Assistance</div>
                            <div class="feature-item">Team Collaboration</div>
                        </div>
                    </div>
                </div>
                
                <div class="footer">
                    <p>Need help? Contact us at {invitation.invited_by.email}</p>
                    <div class="contact-info">
                        <p style="margin-top: 10px; opacity: 0.7; font-size: 0.9rem;">
                            &copy; 2025 Shout Sync. Empowering teams to do their best work.
                        </p>
                    </div>
                </div>
            </div>
        </body>
        </html>
        """
        
        # Plain text version
        text_content = f"""
        INVITATION TO JOIN {team_name.upper()} ON SHOUT SYNC
        
        Hello!
        
        {inviter_name} has invited you to join {team_name} on Shout Sync.
        
        Shout Sync is a collaborative platform for teams to manage projects, 
        communicate in real-time, and boost productivity.
        
        ACCEPT INVITATION:
        {acceptance_url}
        
        DECLINE INVITATION:
        {rejection_url}
        
        This invitation will expire in 7 days.
        
        Features you'll get:
        • Project Management
        • Real-time Chat
        • File Sharing
        • Task Tracking
        • AI Assistance
        • Team Collaboration
        
        Best regards,
        The Shout Sync Team
        """
        
        payload = {
            "sender": {
                "name": "Shout Sync",
                "email": "shoutotbot@gmail.com"
            },
            "to": [{"email": invitation.email}],
            "subject": subject,
            "htmlContent": html_content,
            "textContent": text_content
        }
        
        headers = {
            "accept": "application/json",
            "api-key": self.api_key,
            "content-type": "application/json"
        }
        
        try:
            response = requests.post(self.base_url, json=payload, headers=headers)
            if response.status_code == 201:
                print(f"🎉 Beautiful invitation email sent to {invitation.email}")
                return True
            else:
                print(f"❌ Failed to send email: {response.status_code} - {response.text}")
                return False
        except Exception as e:
            print(f"❌ Error sending email: {str(e)}")
            return False

# Create a global instance
email_service = BrevoEmailService()