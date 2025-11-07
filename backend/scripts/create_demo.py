from django.contrib.auth import get_user_model
from api.models import Project, ProjectMembership, UserStory, ProductBacklogItem

User = get_user_model()

def get_or_create_user(username, email, password):
    u, created = User.objects.get_or_create(username=username, defaults={'email': email})
    if created:
        u.set_password(password)
        u.save()
        print(f'Created user {username}')
    else:
        print(f'User {username} exists')
    return u

og = get_or_create_user('ogjoaoc', 'ogjoaoc@example.com', '1234')
mega = get_or_create_user('mega', 'mega@example.com', 'mega123')

# Create project
p, created = Project.objects.get_or_create(name='Projeto Exemplo', defaults={'description': 'Projeto criado por script', 'owner': og})
if created:
    print('Created project', p.id)
    try:
        ProjectMembership.objects.create(user=og, project=p, role='PO')
    except Exception as e:
        print('Error creating membership for owner:', e)
else:
    # ensure owner is set
    if p.owner != og:
        p.owner = og
        p.save()
    print('Project exists, ensured owner')

# Ensure Mega is a member as DEV
if not ProjectMembership.objects.filter(user=mega, project=p).exists():
    ProjectMembership.objects.create(user=mega, project=p, role='DEV')
    print('Added Mega as DEV')
else:
    print('Mega already member')

# Create 5 user stories
for i in range(1, 6):
    title = f'Historia {i}'
    us, created = UserStory.objects.get_or_create(project=p, title=title, defaults={'description': 'Descricao ficticia', 'acceptance_criteria': 'Critério de aceitação', 'created_by': og})
    if created:
        print('Created user story', us.id)
    else:
        print('User story exists:', us.id)

# Create backlog items for first 5 stories
stories = list(UserStory.objects.filter(project=p).order_by('id')[:5])
for i, s in enumerate(stories, start=1):
    title = f'PBI {i}'
    pbi, created = ProductBacklogItem.objects.get_or_create(project=p, user_story=s, title=title, defaults={'description': 'PBI de exemplo', 'priority': 'MEDIUM', 'created_by': og})
    if created:
        print('Created pbi', pbi.id)
    else:
        print('PBI exists:', pbi.id)

print('Demo data creation finished')
