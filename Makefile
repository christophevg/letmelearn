all: run

run:
	gunicorn letmelearn:app
