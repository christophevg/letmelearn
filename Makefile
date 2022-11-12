all: run

run:
	gunicorn -b 0.0.0.0:8000 -k eventlet -w 1 letmelearn:server
