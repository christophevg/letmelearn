all: run

run:
	gunicorn -k eventlet -w 1 letmelearn:server
