import React, { useState } from 'react';
import styled from 'styled-components';
import Grid from '@material-ui/core/Grid';
import { Trans } from '@lingui/macro';
import { useSelector, useDispatch } from 'react-redux';
import Typography from '@material-ui/core/Typography';
import Box from '@material-ui/core/Box';
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Container,
  Card,
  CardContent,
} from '@material-ui/core';
import { Alert } from '@material-ui/lab';
import Button from '@material-ui/core/Button';
import TextField from '@material-ui/core/TextField';
import InputAdornment from '@material-ui/core/InputAdornment';
import FormHelperText from '@material-ui/core/FormHelperText';
import isElectron from 'is-electron';
import Input from '@material-ui/core/Input';
import { openDialog } from '../../modules/dialog';
import {
  workspaceSelected,
  finalSelected,
  startPlotting,
  resetProgress,
} from '../../modules/plotter_messages';
import { stopService } from '../../modules/daemon_messages';
import { service_plotter } from '../../util/service_names';
import DashboardTitle from '../dashboard/DashboardTitle';
import Flex from '../flex/Flex';
import Log from '../log/Log';
import PlotterCancelModal from './PlotterCancelModal';
import { RootState } from '../../modules/rootReducer';

const StyledContainer = styled(Container)`
  margin-top: ${({ theme }) => `${theme.spacing(2)}px`};
`;

const plot_size_options = [
  { label: '600MiB', value: 25, workspace: '1.8GiB', default_ram: 200 },
  { label: '1.3GiB', value: 26, workspace: '3.6GiB', default_ram: 200 },
  { label: '2.7GiB', value: 27, workspace: '9.2GiB', default_ram: 200 },
  { label: '5.6GiB', value: 28, workspace: '19GiB', default_ram: 200 },
  { label: '11.5GiB', value: 29, workspace: '38GiB', default_ram: 500 },
  { label: '23.8GiB', value: 30, workspace: '83GiB', default_ram: 1000 },
  { label: '49.1GiB', value: 31, workspace: '165GiB', default_ram: 2000 },
  { label: '101.4GiB', value: 32, workspace: '331GiB', default_ram: 3072 },
  { label: '208.8GiB', value: 33, workspace: '660GiB', default_ram: 6000 },
  // workspace are guesses using 55.35% - rounded up - past here
  { label: '429.8GiB', value: 34, workspace: '1300GiB', default_ram: 12000 },
  { label: '884.1GiB', value: 35, workspace: '2600GiB', default_ram: 24000 },
];

const WorkLocation = () => {
  const dispatch = useDispatch();
  const work_location = useSelector(
    (state: RootState) => state.plot_control.workspace_location,
  );
  async function select() {
    if (isElectron()) {
      const dialogOptions = {
        properties: ['openDirectory', 'showHiddenFiles'],
      };
      // @ts-ignore
      const result = await window.remote.dialog.showOpenDialog(dialogOptions);
      const filePath = result.filePaths[0];
      if (filePath) {
        dispatch(workspaceSelected(filePath));
      }
    } else {
      dispatch(
        openDialog(
          '',
          <Trans id="PlotterWorkLocation.availableOnlyFromElectron">
            This feature is available only from electron app
          </Trans>,
        ),
      );
    }
  }

  return (
    <Box display="flex">
      <Box flexGrow={1}>
        <TextField
          variant="outlined"
          fullWidth
          onClick={select}
          inputProps={{
            readOnly: true,
          }}
          value={work_location}
          label={
            <Trans id="PlotterWorkLocation.temporaryFolderLocation">
              Temporary folder location
            </Trans>
          }
        />
      </Box>
      <Button onClick={select} variant="contained" size="large">
        <Trans id="PlotterWorkLocation.select">Select</Trans>
      </Button>
    </Box>
  );
};

const FinalLocation = () => {
  const dispatch = useDispatch();
  const final_location = useSelector(
    (state: RootState) => state.plot_control.final_location,
  );
  async function select() {
    if (isElectron()) {
      const dialogOptions = {
        properties: ['openDirectory', 'showHiddenFiles'],
      };
      // @ts-ignore
      const result = await window.remote.dialog.showOpenDialog(dialogOptions);
      const filePath = result.filePaths[0];
      if (filePath) {
        dispatch(finalSelected(filePath));
      }
    } else {
      dispatch(
        openDialog(
          '',
          <Trans id="PlotterFinalLocation.availableOnlyFromElectron">
            This feature is available only from electron app
          </Trans>,
        ),
      );
    }
  }

  return (
    <Box display="flex">
      <Box flexGrow={1}>
        <TextField
          onClick={select}
          fullWidth
          label={
            <Trans id="PlotterFinalLocation.finalFolderLocation">
              Final folder location
            </Trans>
          }
          value={final_location}
          inputProps={{
            readOnly: true,
          }}
          variant="outlined"
        />
      </Box>
      <Button onClick={select} size="large" variant="contained">
        <Trans id="PlotterFinalLocation.select">Select</Trans>
      </Button>
    </Box>
  );
};

function CreatePlot() {
  const dispatch = useDispatch();
  const work_location = useSelector(
    (state: RootState) => state.plot_control.workspace_location,
  );
  let t2 = useSelector((state: RootState) => state.plot_control.t2);
  const final_location = useSelector(
    (state: RootState) => state.plot_control.final_location,
  );
  const [plotSize, setPlotSize] = React.useState<number>(32);
  const [plotCount, setPlotCount] = React.useState<number>(1);
  const [maxRam, setMaxRam] = React.useState<number>(3072);
  const [numThreads, setNumThreads] = React.useState<number>(2);
  const [numBuckets, setNumBuckets] = React.useState<number>(0);
  const [stripeSize, setStripeSize] = React.useState<number>(65536);

  const changePlotSize = (
    event: React.ChangeEvent<{
      name?: string | undefined;
      value: number;
    }>,
  ) => {
    setPlotSize(event.target.value);
    for (const pso of plot_size_options) {
      if (pso.value === event.target.value) {
        setMaxRam(pso.default_ram);
      }
    }
  };
  const changePlotCount = (
    event: React.ChangeEvent<{
      name?: string | undefined;
      value: number;
    }>,
  ) => {
    setPlotCount(event.target.value);
  };
  const handleSetMaxRam = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setMaxRam(Number.parseInt(event.target.value));
  };
  const handleSetNumBuckets = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setNumBuckets(Number.parseInt(event.target.value));
  };
  const handleSetNumThreads = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setNumThreads(Number.parseInt(event.target.value));
  };
  const handleSetStripeSize = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setStripeSize(Number.parseInt(event.target.value));
  };

  function create() {
    if (!work_location || !final_location) {
      dispatch(
        openDialog(
          <Trans id="CreatePlot.specifyFinalDirectory">
            Please specify a temporary and final directory
          </Trans>,
        ),
      );
      return;
    }
    const N = plotCount;
    const K = plotSize;
    if (!t2 || t2 === '') {
      t2 = work_location;
    }
    dispatch(
      startPlotting(
        K,
        N,
        work_location,
        t2,
        final_location,
        maxRam,
        numBuckets,
        numThreads,
        stripeSize,
      ),
    );
  }

  const plot_count_options = [];
  for (let i = 1; i < 30; i++) {
    plot_count_options.push(i);
  }

  return (
    <Card>
      <CardContent>
        <Grid container spacing={3}>
          <Grid xs={12} item>
            <Typography component="h6" variant="h6">
              <Trans id="CreatePlot.title">Create Plot</Trans>
            </Typography>
          </Grid>
          <Grid xs={12} item>
            <Typography variant="body2">
              <Trans id="CreatePlot.description">
                Using this tool, you can create plots, which are allocated space
                on your hard drive used to farm and earn Chia. Also, temporary
                files are created during the plotting process, which exceed the
                size of the final plot files, so make sure you have enough
                space. Try to use a fast drive like an SSD for the temporary
                folder, and a large slow hard drive (like external HDD) for the
                final folder.
              </Trans>
            </Typography>
          </Grid>
          <Grid xs={12} item>
            <Grid container spacing={2}>
              <Grid item xs={4}>
                <FormControl fullWidth variant="outlined">
                  <InputLabel>
                    <Trans id="CreatePlot.plotSize">Plot Size</Trans>
                  </InputLabel>
                  <Select
                    value={plotSize}
                    // @ts-ignore
                    onChange={changePlotSize}
                    label={<Trans id="CreatePlot.plotSize">Plot Size</Trans>}
                  >
                    {plot_size_options.map((option) => (
                      <MenuItem
                        value={option.value}
                        key={`size${option.value}`}
                      >
                        {option.label} (k={option.value}, temporary space:{' '}
                        {option.workspace})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={4}>
                <FormControl fullWidth variant="outlined">
                  <InputLabel>
                    <Trans id="CreatePlot.plotCount">Plot Count</Trans>
                  </InputLabel>
                  <Select
                    value={plotCount}
                    // @ts-ignore
                    onChange={changePlotCount}
                    label={<Trans id="CreatePlot.colour">Colour</Trans>}
                  >
                    {plot_count_options.map((option) => (
                      <MenuItem value={option} key={`count${option}`}>
                        {option}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={4}>
                <FormControl fullWidth variant="outlined">
                  <InputLabel>
                    <Trans id="CreatePlot.ramMaxUsage">RAM max usage</Trans>
                  </InputLabel>
                  <Input
                    value={maxRam}
                    endAdornment={
                      <InputAdornment position="end">MiB</InputAdornment>
                    }
                    onChange={handleSetMaxRam}
                    type="number"
                  />
                  <FormHelperText id="standard-weight-helper-text">
                    <Trans id="CreatePlot.ramMaxUsageDescription">
                      More memory slightly increases speed
                    </Trans>
                  </FormHelperText>
                </FormControl>
              </Grid>
            </Grid>
            <Grid container spacing={2}>
              <Grid item xs={4}>
                <FormControl fullWidth variant="outlined">
                  <InputLabel>
                    <Trans id="CreatePlot.numberOfThreads">
                      Number of threads
                    </Trans>
                  </InputLabel>
                  <Input
                    value={numThreads}
                    onChange={handleSetNumThreads}
                    type="number"
                  />
                </FormControl>
              </Grid>
              <Grid item xs={4}>
                <FormControl fullWidth variant="outlined">
                  <InputLabel>
                    <Trans id="CreatePlot.numberOfBuckets">
                      Number of buckets
                    </Trans>
                  </InputLabel>
                  <Input
                    value={numBuckets}
                    onChange={handleSetNumBuckets}
                    type="number"
                  />
                  <FormHelperText id="standard-weight-helper-text">
                    <Trans id="CreatePlot.numberOfBucketsDescription">
                      0 automatically chooses bucket count
                    </Trans>
                  </FormHelperText>
                </FormControl>
              </Grid>
              <Grid item xs={4}>
                <FormControl fullWidth variant="outlined">
                  <InputLabel>
                    <Trans id="CreatePlot.stripeSize">Stripe Size</Trans>
                  </InputLabel>
                  <Input
                    value={stripeSize}
                    onChange={handleSetStripeSize}
                    type="number"
                  />
                </FormControl>
              </Grid>
            </Grid>
          </Grid>
          <Grid xs={12} md={8} lg={6} item>
            <Grid spacing={2} container>
              <Grid xs={12} item>
                <WorkLocation />
              </Grid>
              <Grid xs={12} item>
                <FinalLocation />
              </Grid>
            </Grid>
          </Grid>
          <Grid xs={12} item>
            <Grid justify="flex-end" container>
              <Grid item>
                <Button
                  onClick={create}
                  variant="contained"
                  color="primary"
                  size="large"
                >
                  <Trans id="CreatePlot.create">Create</Trans>
                </Button>
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
}

function Proggress() {
  const [showCancelPlottingModal, setShowCancelPlottingModal] = useState<
    boolean
  >(false);
  const progress = useSelector(
    (state: RootState) => state.plot_control.progress,
  );
  const dispatch = useDispatch();

  const inProgress = useSelector(
    (state: RootState) => state.plot_control.plotting_in_proggress,
  );
  const plottingStopped = useSelector(
    (state: RootState) => state.plot_control.plotting_stopped,
  );

  function clearLog() {
    dispatch(resetProgress());
  }

  function cancel() {
    setShowCancelPlottingModal(true);
  }

  function handleClosePlotterCancelModal(cancel?: boolean) {
    if (cancel) {
      dispatch(stopService(service_plotter));
    }

    setShowCancelPlottingModal(false);
  }

  if (!inProgress && !plottingStopped) {
    return null;
  }

  return (
    <>
      <PlotterCancelModal
        isOpen={showCancelPlottingModal}
        onClose={handleClosePlotterCancelModal}
      />
      <Card>
        <CardContent>
          <Grid container spacing={3}>
            <Grid xs={12} item>
              <Typography component="h6" variant="h6">
                <Trans id="PlotterProgress.title">Progress</Trans>
              </Typography>
            </Grid>
            <Grid xs={12} item>
              <Log>{progress.trim()}</Log>
            </Grid>
            {plottingStopped && (
              <Grid xs={12} item>
                <Alert severity="success">
                  <Trans id="PlotterProgress.plottingStoppedSuccesfully">
                    Plotting stopped succesfully.
                  </Trans>
                </Alert>
              </Grid>
            )}
            <Grid xs={12} item>
              <Grid justify="flex-end" spacing={2} container>
                {!plottingStopped && (
                  <Grid item>
                    <Button onClick={cancel} variant="contained">
                      <Trans id="PlotterProgress.cancel">Cancel</Trans>
                    </Button>
                  </Grid>
                )}
                <Grid item>
                  <Button onClick={clearLog} variant="contained">
                    <Trans id="PlotterProgress.clearLog">Clear Log</Trans>
                  </Button>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </>
  );
}

export default function Plotter() {
  return (
    <>
      <DashboardTitle>
        <Trans id="Plotter.title">Plot</Trans>
      </DashboardTitle>
      <Flex
        flexDirection="column"
        flexGrow={1}
        height="100%"
        overflow="auto"
        alignItems="center"
      >
        <StyledContainer maxWidth="lg">
          <Grid container spacing={3}>
            <Grid xs={12} item>
              <CreatePlot />
            </Grid>
            <Grid xs={12} item>
              <Proggress />
            </Grid>
          </Grid>
        </StyledContainer>
      </Flex>
    </>
  );
}
