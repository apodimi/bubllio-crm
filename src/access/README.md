# Access code map

`access` owns authorization around organizations. It answers “can this user
access this workspace, and what may they do there?”

| Looking for | Start here |
| --- | --- |
| Capabilities and tenant resolver | `permissions.py` |
| Workspace membership endpoints | `api/memberships.py` |
| Workspace invitation endpoints | `api/invitations.py` |
| Access tests | `tests/` |

The membership and invitation models still live in `organizations/models.py`
while their migration ownership is being kept stable. This app owns their
authorization behavior, not the workspace database schema.
